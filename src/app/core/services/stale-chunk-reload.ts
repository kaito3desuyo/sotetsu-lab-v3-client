import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { APP_LOCATION } from './app-update.service';

const STORAGE_KEY = 'stale-chunk-reload-url';

/**
 * 古い版の部品が読めずに画面を移れなかったとき、移ろうとした URL を丸ごと読み込み直す。
 * 読み込み直せば、サービスワーカー・CDN から新しい版が届く。
 * 読み込み直しても同じ URL でまた失敗したら、回し続けないように諦める（同じタブの中で 1 回だけ）。
 */
@Injectable({ providedIn: 'root' })
export class StaleChunkReload {
    readonly #location = inject(APP_LOCATION);
    readonly #storage = inject(DOCUMENT).defaultView?.sessionStorage ?? null;

    /** 読み込み直したら true。もう試した URL・読み込み直せない所（サーバー）では false */
    reload(url: string): boolean {
        if (!this.#storage || this.#storage.getItem(STORAGE_KEY) === url) {
            return false;
        }
        this.#storage.setItem(STORAGE_KEY, url);
        this.#location.assign(url);
        return true;
    }

    /** 画面を移れたら印を消す（次のデプロイの後にも 1 回読み込み直せるように） */
    clear(): void {
        this.#storage?.removeItem(STORAGE_KEY);
    }
}
