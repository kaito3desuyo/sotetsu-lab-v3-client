import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatChipListboxChange, MatChipsModule } from '@angular/material/chips';
import { FilterChipOption, FilterChipValue } from './filter-chip-option.type';

/**
 * 絞り込みチップ共通部品。
 *
 * controlled component として振る舞う（永続化は行わない。localStorage 等への
 * 永続化は利用側ページの責務とする）。
 *
 * - mode: 'multiple' の場合は複数選択、'single' の場合は排他選択（R-4: 先頭に ● マーカーを表示し
 *   複数選択チップと見た目を分ける）
 */
@Component({
    selector: 'app-filter-chips',
    templateUrl: './filter-chips.component.html',
    styleUrl: './filter-chips.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatChipsModule],
    host: { class: 'tw-block' },
})
export class FilterChipsComponent {
    readonly mode = input<'multiple' | 'single'>('multiple');
    readonly options = input.required<FilterChipOption[]>();
    readonly selected = input<FilterChipValue[]>([]);

    readonly selectedChange = output<FilterChipValue[]>();

    protected readonly isSingle = computed(() => this.mode() === 'single');

    protected readonly listboxValue = computed<
        FilterChipValue | FilterChipValue[]
    >(() => (this.isSingle() ? this.selected()[0] : this.selected()));

    protected onChange(event: MatChipListboxChange): void {
        const { value } = event;

        if (this.isSingle()) {
            this.selectedChange.emit(
                value === undefined || value === null
                    ? []
                    : [value as FilterChipValue],
            );
            return;
        }

        this.selectedChange.emit((value as FilterChipValue[]) ?? []);
    }
}
