import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysFormationListStateQuery } from 'src/app/global-states/todays-formation-list.state';
import { TodaysOperationListStateQuery } from 'src/app/global-states/todays-operation-list.state';
import { NewOperationNumberColorPipe } from 'src/app/core/pipes/new-operation-number-color.pipe';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { formatFormationAnnotation } from 'src/app/shared/formation-annotation.util';
import { NewOperationNumberLinkComponent } from 'src/app/shared/new-operation-number-link/new-operation-number-link.component';
import { TripPositionComponent } from 'src/app/shared/trip-position/trip-position.component';
import { DashboardStore } from '../../stores/dashboard.store';

/**
 * 「最新の目撃情報」直近 3 件（N3）。
 * 上段に 運用チップ（群色）+ 編成（番号 + 形式・会社）+ 目撃時刻、下段に目撃時の位置
 * （種別チップ + 列車番号 / 発着。operation/real-time と共通の app-trip-position）。
 *
 * 位置は目撃時刻を searchTime に取った現在位置 API の結果であり、「今」の位置ではない。
 * そのため見出しは real-time の「現在位置」ではなく「目撃時」にする。
 *
 * 目撃 API（findManyBySpecificPeriod）は operationId / formationId のみ返し、
 * 運用番号・編成番号を持つネストオブジェクトは含まないため、グローバルの
 * 「今日の運用/編成」リストから ID → 番号を解決する（未解決時は非表示/不明）。
 */
@Component({
    selector: 'app-dashboard-latest-sightings',
    templateUrl: './dashboard-latest-sightings.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DateFnsPipe,
        NewOperationNumberColorPipe,
        NewOperationNumberLinkComponent,
        TripPositionComponent,
    ],
})
export class DashboardLatestSightingsComponent {
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);
    readonly #todaysOperationListStateQuery = inject(
        TodaysOperationListStateQuery,
    );
    readonly #todaysFormationListStateQuery = inject(
        TodaysFormationListStateQuery,
    );

    readonly skeletonRows = [0, 1, 2];

    readonly isLoading = toSignal(DashboardStore.isLoading$, {
        initialValue: true,
    });
    readonly #sightings = toSignal(DashboardStore.latestSightings$, {
        initialValue: [],
    });
    readonly #positions = toSignal(DashboardStore.latestSightingPositions$, {
        initialValue: {},
    });
    readonly stations = toSignal(this.#routeStationListStateQuery.stations$, {
        initialValue: [],
    });
    readonly tripClasses = toSignal(DashboardStore.tripClasses$, {
        initialValue: [],
    });
    readonly #todaysCalendar = toSignal(DashboardStore.todaysCalendar$, {
        initialValue: null,
    });
    readonly calendarId = computed(() => this.#todaysCalendar()?.calendarId);
    readonly #operations = toSignal(
        this.#todaysOperationListStateQuery.todaysOperations$,
        { initialValue: [] },
    );
    readonly #formations = toSignal(
        this.#todaysFormationListStateQuery.todaysFormations$,
        { initialValue: [] },
    );
    readonly #agencies = toSignal(this.#agencyListStateQuery.agencies$, {
        initialValue: [],
    });

    readonly #operationNumberById = computed(
        () =>
            new Map(
                this.#operations().map((operation) => [
                    operation.operationId,
                    operation.operationNumber,
                ]),
            ),
    );
    readonly #formationById = computed(
        () =>
            new Map(
                this.#formations().map((formation) => [
                    formation.formationId,
                    formation,
                ]),
            ),
    );

    readonly items = computed(() =>
        this.#sightings().map((sighting) => {
            const position = this.#positions()[sighting.operationSightingId];
            const formation = sighting.formationId
                ? this.#formationById().get(sighting.formationId)
                : undefined;
            return {
                sighting,
                operationNumber: sighting.operationId
                    ? this.#operationNumberById().get(sighting.operationId)
                    : undefined,
                formationNumber: formation?.formationNumber,
                formationAnnotation: formatFormationAnnotation(
                    formation,
                    this.#agencies(),
                ),
                position,
                hasPosition:
                    !!position?.prev || !!position?.current || !!position?.next,
            };
        }),
    );
}
