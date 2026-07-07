import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { NewOperationNumberColorPipe } from 'src/app/core/pipes/new-operation-number-color.pipe';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { NewOperationNumberLinkComponent } from 'src/app/shared/new-operation-number-link/new-operation-number-link.component';
import { DashboardStore } from '../../stores/dashboard.store';
import { formatCurrentPositionLabel } from '../../utils/format-current-position-label.util';

/**
 * 「最新の目撃情報」直近 3 件（N3）。
 * 運用チップ（群色）+ 編成 + 位置 + 時刻。タップでリアルタイムページへ。
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

    readonly #sightings = toSignal(DashboardStore.latestSightings$, {
        initialValue: [],
    });
    readonly #positions = toSignal(DashboardStore.latestSightingPositions$, {
        initialValue: {},
    });
    readonly #stations = toSignal(this.#routeStationListStateQuery.stations$, {
        initialValue: [],
    });

    readonly items = computed(() =>
        this.#sightings().map((sighting) => ({
            sighting,
            positionLabel: formatCurrentPositionLabel(
                this.#positions()[sighting.operationSightingId],
                this.#stations(),
            ),
        })),
    );
}
