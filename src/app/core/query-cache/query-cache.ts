import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

/**
 * libs の query クラスが持つ画面内キャッシュ。
 * name と params の md5 をキーに、取得を shareReplay で使い回す（エラーになったら次の購読で取り直す）。
 * name ごとに捨てられるので、書き込みに関係するメソッドだけを失効できる（QueryInvalidator）。
 */
export class QueryCache {
    readonly #entries = new Map<
        string,
        { name: string; obs: Observable<unknown> }
    >();

    get<T>(options: {
        /** キャッシュを捨てる単位。query クラスのメソッド名を入れる */
        name: string;
        /** name の中でキーを分ける値（calendarId など） */
        params: object;
        /** キャッシュに無いときの取り方 */
        fetch: () => Observable<T>;
        forceReload?: boolean;
    }): Observable<T> {
        const { name, params, fetch, forceReload } = options;
        const key = md5(JSON.stringify({ name, ...params }));

        if (forceReload) {
            this.#entries.delete(key);
        }

        let entry = this.#entries.get(key);
        if (!entry) {
            entry = {
                name,
                obs: fetch().pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                ),
            };
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
