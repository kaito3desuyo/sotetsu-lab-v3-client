import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SkeletonBarComponent } from './skeleton-bar.component';

/**
 * 絞り込みのチップの行の骨組み。行は app-filter-chips の 1 行と同じ 42px、チップは 32px。
 * 選択肢が届く前に仮のチップ（運用群の「休」だけ等）を出さないために使う。
 */
@Component({
    selector: 'app-skeleton-chips',
    imports: [SkeletonBarComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'tw-flex tw-h-[42px] tw-flex-row tw-items-center tw-gap-2 tw-overflow-hidden',
        'aria-label': '読み込み中',
        'data-testid': 'filter-chips-skeleton',
    },
    template: `
        @for (width of widths(); track $index) {
            <app-skeleton-bar
                class="tw-h-8 tw-shrink-0"
                [class]="width"
            ></app-skeleton-bar>
        }
    `,
})
export class SkeletonChipsComponent {
    /** チップごとの幅の class（例: 'tw-w-14'）。本物のチップの幅に近い値を並べる */
    readonly widths = input.required<readonly string[]>();
}
