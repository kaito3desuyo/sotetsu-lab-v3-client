import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NewOperationNumberColorPipe } from 'src/app/core/pipes/new-operation-number-color.pipe';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';
import { withRetiredGroup } from '../../utils/operation-real-time-filter.util';

/**
 * リアルタイム運用情報: 会社（B2）・運用群（B3）絞り込みチップ行。
 *
 * mockup-02 / 98 §G2 準拠: 見出しは「絞り込み（表示のみ・取得と購読は全件のまま）」
 * の 1 行に統合し、会社チップ（選択=紺塗り✓）と運用群チップ（選択=オレンジ塗り✓）を
 * 横スクロール 1 行に混在させる。
 *
 * 表示フィルタ（非破壊）: 選択状態は OperationRealTimeStore に書き込むのみで
 * データ取得・WebSocket 購読には一切影響しない。永続化は同ストアの
 * elf-persist-state（localforage, key: 'OperationRealTimeStore'）に委譲する。
 */
@Component({
    selector: 'app-operation-real-time-filter',
    templateUrl: './operation-real-time-filter.component.html',
    styleUrl: './operation-real-time-filter.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FilterChipsComponent],
})
export class OperationRealTimeFilterComponent {
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);
    readonly #operationNumberColorPipe = new NewOperationNumberColorPipe();

    readonly agencies = toSignal(this.#agencyListStateQuery.agencies$, {
        initialValue: [],
    });
    readonly operationGroups = toSignal(OperationRealTimeStore.operationGroups$, {
        initialValue: [],
    });
    readonly selectedAgencyIds = toSignal(
        OperationRealTimeStore.selectedAgencyIds$,
        { initialValue: [] },
    );
    readonly selectedGroupNames = toSignal(
        OperationRealTimeStore.selectedGroupNames$,
        { initialValue: [] },
    );

    readonly agencyOptions = computed<FilterChipOption[]>(() =>
        this.agencies().map((agency) => ({
            value: agency.agencyId,
            label: agency.agencyName,
        })),
    );

    readonly groupOptions = computed<FilterChipOption[]>(() =>
        withRetiredGroup(this.operationGroups()).map((group) => ({
            value: group.groupName,
            label: group.groupName,
            color: this.#operationNumberColorPipe.transform(
                group.operationNumbers[0],
            ),
        })),
    );

    /**
     * 会社（選択=紺塗り）→運用群（選択=オレンジ塗り）の順に 1 行へ統合した
     * チップオプション（98 §G2「モックの選択色 2 系統を踏襲」）。
     */
    readonly chipOptions = computed<FilterChipOption[]>(() => [
        ...this.agencyOptions().map((option) => ({
            ...option,
            selectedColor: 'primary' as const,
        })),
        ...this.groupOptions().map((option) => ({
            ...option,
            selectedColor: 'accent' as const,
        })),
    ]);

    readonly selectedValues = computed<FilterChipValue[]>(() => [
        ...this.selectedAgencyIds(),
        ...this.selectedGroupNames(),
    ]);

    onAgencyChange(values: FilterChipValue[]): void {
        OperationRealTimeStore.setSelectedAgencyIds(values as string[]);
    }

    onGroupChange(values: FilterChipValue[]): void {
        OperationRealTimeStore.setSelectedGroupNames(values as string[]);
    }

    /** 混在 1 行チップの選択値を会社と運用群へ振り分けてストアに書き込む。 */
    onChipsChange(values: FilterChipValue[]): void {
        const agencyIds = new Set(
            this.agencyOptions().map((option) => option.value),
        );
        const groupNames = new Set(
            this.groupOptions().map((option) => option.value),
        );
        this.onAgencyChange(values.filter((value) => agencyIds.has(value)));
        this.onGroupChange(values.filter((value) => groupNames.has(value)));
    }
}
