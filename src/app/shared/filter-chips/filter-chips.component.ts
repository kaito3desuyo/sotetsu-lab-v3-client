import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatChipListboxChange, MatChipsModule } from '@angular/material/chips';
import { FilterChipOption, FilterChipValue } from './filter-chip-option.type';

/**
 * 絞り込みチップ共通部品。
 *
 * controlled component として振る舞う（永続化は行わない。localStorage 等への
 * 永続化は利用側ページの責務とする）。
 *
 * - mode: 'multiple' の場合は複数選択、'single' の場合は排他選択（R-4: 選択中チップの
 *   先頭に ✓ の代わりの ● マーカーを表示し「モード切替」であることを分ける。
 *   非選択チップには付けない — 全チップに付けると箇条書きの点に見えるため）
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

    /** group が指定されたオプションが 1 つでもあれば会社等でグルーピング表示する。 */
    protected readonly hasGroups = computed(() =>
        this.options().some((option) => !!option.group),
    );

    /** options を出現順のグループにまとめる（group 未指定は undefined グループにまとまる）。 */
    protected readonly groupedOptions = computed<
        { group: string | undefined; options: FilterChipOption[] }[]
    >(() => {
        const groups: { group: string | undefined; options: FilterChipOption[] }[] =
            [];
        const indexByGroup = new Map<string | undefined, number>();
        for (const option of this.options()) {
            const group = option.group;
            if (!indexByGroup.has(group)) {
                indexByGroup.set(group, groups.length);
                groups.push({ group, options: [] });
            }
            groups[indexByGroup.get(group)!].options.push(option);
        }
        return groups;
    });

    protected readonly listboxValue = computed<
        FilterChipValue | FilterChipValue[]
    >(() => (this.isSingle() ? this.selected()[0] : this.selected()));

    protected isSelectedValue(value: FilterChipValue): boolean {
        return this.selected().includes(value);
    }

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
