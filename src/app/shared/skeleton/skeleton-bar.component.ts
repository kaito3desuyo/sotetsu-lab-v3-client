import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * 骨組み（skeleton）の灰色の棒 1 本。大きさ・角の丸みは使う側が class で渡す
 * （例: `<app-skeleton-bar class="tw-h-5 tw-w-24">`）。見た目はダッシュボードの骨組みと同じ。
 * 棒 1 本は読み上げず、包む側に aria-label="読み込み中" を付ける。
 */
@Component({
    selector: 'app-skeleton-bar',
    template: '',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'tw-block tw-animate-pulse tw-rounded-control tw-bg-paper-3 motion-reduce:tw-animate-none',
        'aria-hidden': 'true',
    },
})
export class SkeletonBarComponent {}
