import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';

type Entry = {
    name: string;
    obs: Observable<unknown>;
    /** 値が届いた時刻（Date.now()）。maxAgeMs はここから数える */
    receivedAt?: number;
};

/**
 * libs の query クラスが持つ画面内キャッシュ。
 * name と params の md5 をキーに、取得を shareReplay で使い回す（エラーになったら次の購読で取り直す）。
 * name ごとに捨てられるので、書き込みに関係するメソッドだけを失効できる（QueryInvalidator）。
 * maxAgeMs を渡した呼び出しは、届いてからその長さを過ぎた値を使わず取り直す（docs/adr/0007）。
 */
export class QueryCache {
    readonly #entries = new Map<string, Entry>();

    get<T>(options: {
        /** キャッシュを捨てる単位。query クラスのメソッド名を入れる */
        name: string;
        /** name の中でキーを分ける値（calendarId など） */
        params: object;
        /** キャッシュに無いときの取り方 */
        fetch: () => Observable<T>;
        forceReload?: boolean;
        /** 届いてからこの長さ（ms）を過ぎた値は使わず、取り直す。省略すれば期限なし */
        maxAgeMs?: number;
    }): Observable<T> {
        const { name, params, fetch, forceReload, maxAgeMs } = options;
        const key = md5(JSON.stringify({ name, ...params }));

        const cached = this.#entries.get(key);
        const isStale =
            maxAgeMs !== undefined &&
            cached?.receivedAt !== undefined &&
            Date.now() - cached.receivedAt > maxAgeMs;
        if (forceReload || isStale) {
            this.#entries.delete(key);
        }

        let entry = this.#entries.get(key);
        if (!entry) {
            const created: Entry = { name, obs: undefined };
            created.obs = fetch().pipe(
                tap(() => (created.receivedAt = Date.now())),
                shareReplay({ bufferSize: 1, refCount: true }),
            );
            entry = created;
            this.#entries.set(key, entry);
        }

        return entry.obs as Observable<T>;
    }

    clear(names?: readonly string[]): void {
        if (!names) {
            this.#entries.clear();
            return;
        }
        for (const [key, entry] of this.#entries) {
            if (names.includes(entry.name)) {
                this.#entries.delete(key);
            }
        }
    }
}
