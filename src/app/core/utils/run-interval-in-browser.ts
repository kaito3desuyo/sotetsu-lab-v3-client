import { isPlatformBrowser } from '@angular/common';
import {
    afterNextRender,
    DestroyRef,
    inject,
    NgZone,
    PLATFORM_ID,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

/**
 * 一定間隔で tick を呼ぶ。ブラウザで最初の描画の後に張り、呼んだ部品が壊れたら止まる。
 * サーバーでは張らない（張ると zone.js がアプリを落ち着かせず、SSR が終わらない）。
 * タイマーは Angular の zone の中で張るので、これまでどおり tick のたびに変更検知が走る
 * （afterNextRender の中は zone の外なので ngZone.run で戻す）。
 * 注入の文脈（constructor・フィールドの初期化）で呼ぶ。
 */
export function runIntervalInBrowser(
    periodMs: number,
    tick: () => void | Promise<void>,
): void {
    const destroyRef = inject(DestroyRef);
    const ngZone = inject(NgZone);
    // afterNextRender は本物のサーバーでは何もしないが、PLATFORM_ID だけを差し替えたテストでは動いてしまう。
    // プラットフォームを明示して見るので、どちらでも同じ振る舞いになる。
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
        return;
    }
    afterNextRender(() => {
        ngZone.run(() => {
            interval(periodMs)
                .pipe(takeUntilDestroyed(destroyRef))
                .subscribe(() => void tick());
        });
    });
}
