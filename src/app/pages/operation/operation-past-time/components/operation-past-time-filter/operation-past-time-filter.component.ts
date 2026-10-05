import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { agenciesInThroughServiceOrder } from 'src/app/shared/agencies-in-through-service-order.util';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { OperationPastTimeStore } from '../../stores/operation-past-time.store';

/**
 * 過去の運用情報: 編成所属会社での絞り込みチップ（B9・B2 と同一部品）。
 *
 * 表示フィルタ（非破壊）: 選択状態はストアに書き込むのみで、データ取得には
 * 一切影響しない。マトリクス（編成行）の表示/非表示のみに使う。
 */
@Component({
    selector: 'app-operation-past-time-filter',
    templateUrl: './operation-past-time-filter.component.html',
    styleUrl: './operation-past-time-filter.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FilterChipsComponent],
})
export class OperationPastTimeFilterComponent {
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);

    readonly agencies = toSignal(this.#agencyListStateQuery.agencies$, {
        initialValue: [],
    });
    readonly routes = toSignal(
        this.#routeStationListStateQuery.routeStations$,
        { initialValue: [] },
    );
    readonly selectedAgencyIds = toSignal(
        OperationPastTimeStore.selectedAgencyIds$,
        { initialValue: [] },
    );

    /** 会社は相鉄と直通を始めた順に並べる（agenciesInThroughServiceOrder）。 */
    readonly agencyOptions = computed<FilterChipOption[]>(() =>
        agenciesInThroughServiceOrder(this.agencies(), this.routes()).map(
            (agency) => ({
                value: agency.agencyId,
                label: agency.agencyName,
            }),
        ),
    );

    onAgencyChange(values: FilterChipValue[]): void {
        OperationPastTimeStore.setSelectedAgencyIds(values as string[]);
    }
}
