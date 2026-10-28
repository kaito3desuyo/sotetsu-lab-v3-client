import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
} from '@angular/core';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { sortByThroughServiceAgency } from 'src/app/shared/agencies-in-through-service-order.util';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import {
    formatRouteFilterSummary,
    isRouteFilterActive,
    joinSummaryParts,
} from 'src/app/shared/control-band/control-band-summary.util';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { SkeletonChipsComponent } from 'src/app/shared/skeleton/skeleton-chips.component';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ControlBandComponent,
        FilterChipsComponent,
        SkeletonChipsComponent,
    ],
    host: { class: 'tw-contents' },
})
export class OperationRouteDiagramRouteFilterComponent {
    readonly #routeStationListState = inject(RouteStationListState);
    readonly #agencyListState = inject(AgencyListState);
    readonly #store = inject(OperationRouteDiagramStore);

    readonly #storeRouteOptions = this.#store.routeOptions;
    readonly #routes = this.#routeStationListState.routeStations;
    readonly #agencies = this.#agencyListState.agencies;

    /** 運用番号が無くてもチップが無くても帯を出す（帯に選択欄を差し込むページ用） */
    readonly alwaysVisible = input(false);
    /** 要約の頭（運用番号とダイヤ）。路線の要約の前に付ける */
    readonly summaryLead = input('');

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
    readonly isAwaitingOperationTrips = this.#store.isAwaitingOperationTrips;
    /** 路線のチップの骨組みの幅（本線・いずみ野線・厚木線・新横浜線の幅に近い値） */
    readonly routeSkeletonWidths = ['tw-w-16', 'tw-w-24', 'tw-w-20', 'tw-w-24'];
    readonly selectedRouteIds = this.#store.selectedRouteIds;

    readonly filterActive = computed(() =>
        isRouteFilterActive(this.routeOptions(), this.selectedRouteIds()),
    );
    readonly bandSummary = computed(() => {
        const routes = formatRouteFilterSummary(
            this.routeOptions(),
            this.selectedRouteIds(),
        );
        return routes === '全路線' ? routes : `路線：${routes}`;
    });
    /** 路線のチップが無いとき（運用を開いていない）は、路線の要約を付けない */
    readonly summary = computed(() =>
        joinSummaryParts([
            this.summaryLead(),
            this.isAwaitingOperationTrips() || this.routeOptions().length === 0
                ? null
                : this.bandSummary(),
        ]),
    );

    onChange(values: FilterChipValue[]): void {
        this.#store.setSelectedRouteIds(values);
    }
}
