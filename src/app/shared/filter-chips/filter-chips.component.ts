import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    afterRenderEffect,
    computed,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
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
 * - scrollMode: true の場合はチップを折り返さず横スクロール可能な 1 行に収め、
 *   左右に薄い矢印インジケータを表示する（mockup-05 全線時刻表の路線チップ準拠）。
 *   既定 false（従来どおりの折返し表示）
 * - selectedColor: 選択中チップの塗り色。**既定 'accent'（オレンジ）で全ページ統一**
 *   （ユーザー指示 2026-08-22）。ページごとに選択色を変えない。
 *   オレンジ地の文字・✓ は暗色（`--color-accent-ink` / 6.38:1）にする。
 *   白文字は 2.79:1 で不合格（docs/design.md 色の掟 2）
 */
@Component({
    selector: 'app-filter-chips',
    templateUrl: './filter-chips.component.html',
    styleUrl: './filter-chips.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatChipsModule],
    host: {
        class: 'tw-block',
        '(window:resize)': 'updateScrollIndicators()',
    },
})
export class FilterChipsComponent {
    readonly mode = input<'multiple' | 'single'>('multiple');
    readonly options = input.required<FilterChipOption[]>();
    readonly selected = input<FilterChipValue[]>([]);
    /** true でチップを横スクロール 1 行表示にする（既定は折返し表示） */
    readonly scrollMode = input<boolean>(false);
    /** 選択中チップの塗り色。既定 'accent'（オレンジ）で全ページ統一 */
    readonly selectedColor = input<'primary' | 'accent'>('accent');

    readonly selectedChange = output<FilterChipValue[]>();

    // signal query は ES private（#）にできない Angular 制約があるため protected
    protected readonly scroller =
        viewChild<ElementRef<HTMLElement>>('scroller');

    /** 左右の矢印インジケータ表示可否（scrollMode 時のみ更新される） */
    protected readonly canScrollLeft = signal(false);
    protected readonly canScrollRight = signal(false);

    protected readonly isSingle = computed(() => this.mode() === 'single');

    /** group が指定されたオプションが 1 つでもあれば会社等でグルーピング表示する。 */
    protected readonly hasGroups = computed(() =>
        this.options().some((option) => !!option.group),
    );

    /** options を出現順のグループにまとめる（group 未指定は undefined グループにまとまる）。 */
    protected readonly groupedOptions = computed<
        { group: string | undefined; options: FilterChipOption[] }[]
    >(() => {
        const groups: {
            group: string | undefined;
            options: FilterChipOption[];
        }[] = [];
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

    constructor() {
        // options / scrollMode の変化後（描画完了後）にスクロール可否を測り直す
        afterRenderEffect(() => {
            this.options();
            this.scrollMode();
            this.updateScrollIndicators();
        });
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

    /** スクロール位置から左右矢印インジケータの表示可否を更新する。 */
    protected updateScrollIndicators(): void {
        if (!this.scrollMode()) {
            return;
        }
        const el = this.scroller()?.nativeElement;
        if (!el) {
            return;
        }
        this.canScrollLeft.set(el.scrollLeft > 0);
        this.canScrollRight.set(
            el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
        );
    }
}
