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

    onAgencyChange(values: FilterChipValue[]): void {
        OperationRealTimeStore.setSelectedAgencyIds(values as string[]);
    }

    onGroupChange(values: FilterChipValue[]): void {
        OperationRealTimeStore.setSelectedGroupNames(values as string[]);
    }
}
