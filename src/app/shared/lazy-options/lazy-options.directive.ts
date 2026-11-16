import {
    afterNextRender,
    DestroyRef,
    Directive,
    inject,
    input,
    signal,
} from '@angular/core';

/** requestIdleCallback の無いブラウザ（Safari）で、次の 1 歩を待つ長さ */
const IDLE_FALLBACK_MS = 50;

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
 *
 * `appLazyOptionsSteps` に塊の数（駅なら路線の群の数）を渡すと、描いたあとの空き時間に
 * 塊を 1 つずつ作る（`built()` が 1 ずつ増える）。押してから 282 個を一度に作ると 177ms の
 * 長いタスクになっていたので、押す前に少しずつ作っておく（P9）。全部作り終えたら `ready()` も true にする。
 * 途中で押されたら、残りをその場で全部作る（今までと同じ）。
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
    /** 空き時間に作る塊の数。0（既定）なら空き時間には作らない */
    readonly appLazyOptionsSteps = input(0);

    readonly #ready = signal(false);
    readonly #built = signal(0);

    /** 選択肢を全部作ってよいか。選ぶ操作が始まったか、空き時間に全部作り終えたら true */
    readonly ready = this.#ready.asReadonly();

    /** 空き時間に作り終えた塊の数（ready の前に、先頭からこの数だけ作る） */
    readonly built = this.#built.asReadonly();

    constructor() {
        let cancel: (() => void) | null = null;
        inject(DestroyRef).onDestroy(() => cancel?.());

        const step = (): void => {
            cancel = null;
            if (this.#ready()) return;
            const next = this.#built() + 1;
            this.#built.set(next);
            if (next >= this.appLazyOptionsSteps()) {
                this.#ready.set(true);
                return;
            }
            cancel = whenIdle(step);
        };

        // サーバーでは呼ばれない。hydration のあとに始める
        afterNextRender(() => {
            if (this.appLazyOptionsSteps() > 0 && !this.#ready())
                cancel = whenIdle(step);
        });
    }

    protected activate(): void {
        this.#ready.set(true);
    }
}

/** 空き時間に fn を 1 回呼ぶ。返す関数で取り消す */
function whenIdle(fn: () => void): () => void {
    if (typeof requestIdleCallback === 'function') {
        const id = requestIdleCallback(fn);
        return () => cancelIdleCallback(id);
    }
    const id = setTimeout(fn, IDLE_FALLBACK_MS);
    return () => clearTimeout(id);
}
