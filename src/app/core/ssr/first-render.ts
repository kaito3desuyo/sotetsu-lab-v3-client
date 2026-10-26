import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
    afterNextRender,
    computed,
    inject,
    Injectable,
    PLATFORM_ID,
    signal,
    type Signal,
} from '@angular/core';

/**
 * ブラウザの最初の描画が済んだか。
 *
 * サーバーで描いた HTML を引き継ぐ（hydration）とき、ブラウザの最初の描画はサーバーと同じ形でなければならない。
 * ログインした人・今日の日付・端末に保存した状態で形が変わる表示は、これが true になってから出す（spec 5.2・5.3・13.2）。
 * - サーバー: false のまま（ゲスト・今日なし・保存なしで描く）
 * - サーバーの HTML を引き継ぐブラウザ: 最初の描画の後に true
 * - サーバーの HTML が無い起動（Service Worker の殻・S3 の index.html・テスト）: 合わせる相手が無いので最初から true
 *
 * サーバーの HTML かどうかは、サーバーが根の要素に付ける `ng-server-context` で見分ける。
 */
@Injectable({ providedIn: 'root' })
export class FirstRender {
    readonly #done = signal(false);
    readonly done = this.#done.asReadonly();

    constructor() {
        if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
        if (!inject(DOCUMENT).querySelector('[ng-server-context]')) {
            this.#done.set(true);
            return;
        }
        afterNextRender(() => this.#done.set(true));
    }
}

/**
 * 最初の描画が済むまでは fallback（サーバーで描いたときの値）を、済んだら source を返す。
 * 注入の文脈（フィールドの初期化・constructor）で呼ぶ。
 */
export function afterFirstRender<T>(source: Signal<T>, fallback: T): Signal<T> {
    const firstRender = inject(FirstRender);
    return computed(() => (firstRender.done() ? source() : fallback));
}
