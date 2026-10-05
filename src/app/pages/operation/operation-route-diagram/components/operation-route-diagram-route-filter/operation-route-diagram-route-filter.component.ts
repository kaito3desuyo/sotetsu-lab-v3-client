import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { sortByThroughServiceAgency } from 'src/app/shared/agencies-in-through-service-order.util';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { OperationRouteDiagramStore } from '../../stores/operation-route-diagram.store';

/**
 * B5: 運用行路図の路線絞り込みチップ。
 *
 * 既定 ON は「当該運用が経由する路線のみ」（OperationRouteDiagramStore.initializeSelectedRouteIds
 * で運用データ取得後に設定される）。経由しない路線は disabled + OFF で表示する。
 * 並びと会社名の見出しは全線時刻表・列車位置情報と同じ（docs/design.md「会社・路線の並び」）。
 */
@Component({
    selector: 'app-operation-route-diagram-route-filter',
    templateUrl: './operation-route-diagram-route-filter.component.html',
    styleUrl: './operation-route-diagram-route-filter.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FilterChipsComponent],
})
export class OperationRouteDiagramRouteFilterComponent {
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);

    readonly #storeRouteOptions = toSignal(
        OperationRouteDiagramStore.routeOptions$,
        { initialValue: [] },
    );
    readonly #routes = toSignal(
        this.#routeStationListStateQuery.routeStations$,
        { initialValue: [] },
    );
    readonly #agencies = toSignal(this.#agencyListStateQuery.agencies$, {
        initialValue: [],
    });

    readonly routeOptions = computed<FilterChipOption[]>(() => {
        const agencyNameById = new Map(
            this.#agencies().map((agency) => [
                agency.agencyId,
                agency.agencyName,
            ]),
        );
        const orderedRoutes = sortByThroughServiceAgency(
            this.#routes(),
            (route) => route.agencyId,
            this.#agencies(),
        );
        const rank = new Map(
            orderedRoutes.map((route, index) => [route.routeId, index]),
        );
        const agencyIdByRoute = new Map(
            orderedRoutes.map((route) => [route.routeId, route.agencyId]),
        );
        // 一覧に無い路線は元の並びのまま末尾へ
        return this.#storeRouteOptions()
            .map((option, index) => ({ option, index }))
            .sort(
                (a, b) =>
                    (rank.get(String(a.option.value)) ?? Infinity) -
                        (rank.get(String(b.option.value)) ?? Infinity) ||
                    a.index - b.index,
            )
            .map(({ option }) => {
                const agencyId = agencyIdByRoute.get(String(option.value));
                return {
                    ...option,
                    group: agencyId ? agencyNameById.get(agencyId) : undefined,
                };
            });
    });
    readonly selectedRouteIds = toSignal(
        OperationRouteDiagramStore.selectedRouteIds$,
        { initialValue: [] },
    );

    onChange(values: FilterChipValue[]): void {
        OperationRouteDiagramStore.setSelectedRouteIds(values);
    }
}
