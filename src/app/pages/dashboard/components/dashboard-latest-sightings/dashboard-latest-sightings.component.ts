import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysFormationListStateQuery } from 'src/app/global-states/todays-formation-list.state';
import { TodaysOperationListStateQuery } from 'src/app/global-states/todays-operation-list.state';
import { NewOperationNumberColorPipe } from 'src/app/core/pipes/new-operation-number-color.pipe';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { NewOperationNumberLinkComponent } from 'src/app/shared/new-operation-number-link/new-operation-number-link.component';
import { DashboardStore } from '../../stores/dashboard.store';
import { formatCurrentPositionLabel } from '../../utils/format-current-position-label.util';

/**
 * 「最新の目撃情報」直近 3 件（N3）。
 * 運用チップ（群色）+ 編成 + 位置 + 時刻。タップでリアルタイムページへ。
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
        RouterLink,
        DateFnsPipe,
        NewOperationNumberColorPipe,
        NewOperationNumberLinkComponent,
    ],
})
export class DashboardLatestSightingsComponent {
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);
    readonly #todaysOperationListStateQuery = inject(
        TodaysOperationListStateQuery,
    );
    readonly #todaysFormationListStateQuery = inject(
        TodaysFormationListStateQuery,
    );

    readonly #sightings = toSignal(DashboardStore.latestSightings$, {
        initialValue: [],
    });
    readonly #positions = toSignal(DashboardStore.latestSightingPositions$, {
        initialValue: {},
    });
    readonly #stations = toSignal(this.#routeStationListStateQuery.stations$, {
        initialValue: [],
    });
    readonly #operations = toSignal(
        this.#todaysOperationListStateQuery.todaysOperations$,
        { initialValue: [] },
    );
    readonly #formations = toSignal(
        this.#todaysFormationListStateQuery.todaysFormations$,
        { initialValue: [] },
    );

    readonly #operationNumberById = computed(
        () =>
            new Map(
                this.#operations().map((operation) => [
                    operation.operationId,
                    operation.operationNumber,
                ]),
            ),
    );
    readonly #formationNumberById = computed(
        () =>
            new Map(
                this.#formations().map((formation) => [
                    formation.formationId,
                    formation.formationNumber,
                ]),
            ),
    );

    readonly items = computed(() =>
        this.#sightings().map((sighting) => ({
            sighting,
            operationNumber: sighting.operationId
                ? this.#operationNumberById().get(sighting.operationId)
                : undefined,
            formationNumber: sighting.formationId
                ? this.#formationNumberById().get(sighting.formationId)
                : undefined,
            positionLabel: formatCurrentPositionLabel(
                this.#positions()[sighting.operationSightingId],
                this.#stations(),
            ),
        })),
    );
}
