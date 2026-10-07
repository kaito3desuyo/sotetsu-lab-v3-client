import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type QueryInvalidationTag = 'timetable' | 'sighting';

/**
 * 書いた後、その tag の GET を `cache: 'reload'` で取る長さ。
 * API の CACHE_CONTROL と同じでなければならない
 * （sotetsu-lab-v3-api の docs/superpowers/specs/2026-10-07-browser-private-cache-design.md）。
 * - timetable: CACHE_CONTROL.TIMETABLE（`private, max-age=3600`）。改正では calendarId ごと URL が変わるので、1 時間でよい（docs/adr/0002 の追記）
 * - sighting: CACHE_CONTROL.REALTIME（`no-store`）なのでブラウザに残らず、窓は要らない
 */
export const RELOAD_WINDOW_MS: Record<QueryInvalidationTag, number> = {
    timetable: 3_600_000,
    sighting: 0,
};

/** 書いた時刻を置く localStorage のキー。読み込み直しても、別のタブでも窓を引き継ぎ、別のタブに知らせるために使う。 */
export const WRITTEN_AT_KEYS: Readonly<Record<QueryInvalidationTag, string>> = {
    timetable: 'sotetsu-lab:timetable-written-at',
    sighting: 'sotetsu-lab:sighting-written-at',
};

const TAGS = Object.keys(WRITTEN_AT_KEYS) as QueryInvalidationTag[];

/**
 * 書き込みが成功したことを query クラスに知らせ、関係する画面内キャッシュを捨てさせる。
 * 'timetable' は列車情報、'sighting' は目撃の書き込み。マスタはアプリから書かないので tag が無い。
 */
@Injectable({ providedIn: 'root' })
export class QueryInvalidator {
    readonly #invalidated = new Subject<QueryInvalidationTag>();
    readonly invalidated$: Observable<QueryInvalidationTag> =
        this.#invalidated.asObservable();

    /** localStorage が使えない環境のための、このタブだけの控え */
    readonly #writtenAt: Partial<Record<QueryInvalidationTag, number>> = {};

    constructor() {
        const window = inject(DOCUMENT).defaultView;
        // 別のタブで書かれたら、このタブの画面内キャッシュも捨てる
        const onStorage = (event: StorageEvent) => {
            const tag = TAGS.find((t) => WRITTEN_AT_KEYS[t] === event.key);
            if (!tag || !event.newValue) {
                return;
            }
            this.#writtenAt[tag] = Number(event.newValue);
            this.#invalidated.next(tag);
        };
        window?.addEventListener('storage', onStorage);
        inject(DestroyRef).onDestroy(() =>
            window?.removeEventListener('storage', onStorage),
        );
    }

    invalidate(tag: QueryInvalidationTag): void {
        const now = Date.now();
        this.#writtenAt[tag] = now;
        try {
            localStorage.setItem(WRITTEN_AT_KEYS[tag], String(now));
        } catch {
            // 覚えられなくても、このタブでは #writtenAt で窓が効く。別のタブには届かない
        }
        this.#invalidated.next(tag);
    }

    /**
     * 別の経路（WebSocket）で知らされた書き込みを、このタブだけで流す。
     * ほかのタブにも同じ経路で届くので、localStorage には書かない。
     */
    invalidateLocal(tag: QueryInvalidationTag): void {
        this.#invalidated.next(tag);
    }

    /** その tag の GET に渡す `cache`。書いてから窓の長さのあいだは `'reload'`。 */
    requestCache(tag: QueryInvalidationTag): RequestCache {
        const writtenAt = this.#readWrittenAt(tag);
        return writtenAt !== null &&
            Date.now() - writtenAt < RELOAD_WINDOW_MS[tag]
            ? 'reload'
            : 'default';
    }

    #readWrittenAt(tag: QueryInvalidationTag): number | null {
        let stored: number | null = null;
        try {
            const value = localStorage.getItem(WRITTEN_AT_KEYS[tag]);
            stored = value === null ? null : Number(value);
        } catch {
            stored = null;
        }
        const candidates = [stored, this.#writtenAt[tag] ?? null].filter(
            (v): v is number => v !== null && Number.isFinite(v),
        );
        return candidates.length > 0 ? Math.max(...candidates) : null;
    }
}
