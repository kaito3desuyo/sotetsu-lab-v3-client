import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
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
    readonly #store = inject(OperationPastTimeStore);
    readonly #agencyListState = inject(AgencyListState);
    readonly #routeStationListState = inject(RouteStationListState);

    readonly agencies = this.#agencyListState.agencies;
    readonly routes = this.#routeStationListState.routeStations;
    readonly selectedAgencyIds = this.#store.selectedAgencyIds;

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
        this.#store.setSelectedAgencyIds(values as string[]);
    }
}
