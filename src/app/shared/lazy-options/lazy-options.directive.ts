import { Directive, signal } from '@angular/core';

/**
 * `mat-select` の選択肢（`mat-option`）を、選ぶ操作が始まるまで作らない。
 * `mat-option` はパネルが閉じていても全部作られ、DOM に載らないのでサーバーの HTML にも無く、
 * ブラウザが hydration のたびに作り直す。駅の選択肢は 282 個で、作るだけで 1 画面 0.14〜0.25 s
 * かかっていた（2026-10-28 実測・スマホ相当 CPU 4 倍）。
 *
 * `pointerdown` はフォーカスより前に来るので、押した直後のパネルを開く前に選択肢がそろう。
 * サーバーでは何もしない（最初の描画がサーバーとブラウザで同じになる）。一度 true になったら戻さない。
 *
 * 使う側は `ready()` が false の間、選んでいる 1 項目だけを `mat-option` にして値の表示を保つ
 * （`mat-select` は選択肢に無い値を「空」とみなす）。
 */
@Directive({
    selector: 'mat-select[appLazyOptions]',
    exportAs: 'appLazyOptions',
    host: {
        '(focusin)': 'activate()',
        '(pointerdown)': 'activate()',
    },
})
export class LazyOptionsDirective {
    readonly #ready = signal(false);

    /** 選択肢を作ってよいか。選ぶ操作が始まったら true */
    readonly ready = this.#ready.asReadonly();

    protected activate(): void {
        this.#ready.set(true);
    }
}
