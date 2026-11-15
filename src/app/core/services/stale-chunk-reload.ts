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
    readonly #document = inject(DOCUMENT);
    readonly #storage = this.#document.defaultView?.sessionStorage ?? null;
    /**
     * このページで一度決めた答え（読み込み直したか・諦めたか）。同じ失敗が画面の移動（NavigationError）と
     * ErrorHandler の両方に届くので、後から来た方が別の URL で読み込み直さないよう、最初の答えを返し続ける
     */
    #decided: boolean | null = null;

    /** 読み込み直したら true。もう試した URL・読み込み直せない所（サーバー）では false */
    reload(url: string): boolean {
        if (this.#decided !== null) return this.#decided;
        if (!this.#storage || this.#storage.getItem(STORAGE_KEY) === url) {
            this.#decided = false;
            return false;
        }
        this.#storage.setItem(STORAGE_KEY, url);
        this.#decided = true;
        this.#location.assign(url);
        return true;
    }

    /**
     * 画面の移動の外（@defer・後から読み込む部品）で部品が読めなかったとき、今の URL を読み込み直す。
     * 移動の中の失敗は app.component が移ろうとした URL で読み込み直す
     */
    reloadCurrent(): boolean {
        const location = this.#document.defaultView?.location;
        if (!location) return false;
        return this.reload(
            `${location.pathname}${location.search}${location.hash}`,
        );
    }

    /**
     * 画面を移れたら印を消す（次のデプロイの後にも 1 回読み込み直せるように）。
     * 読み込み直した直後の最初の移動では呼ばない（その後に @defer の部品がまた読めないと、印が無いので読み込み直し続ける）
     */
    clear(): void {
        this.#storage?.removeItem(STORAGE_KEY);
    }
}
