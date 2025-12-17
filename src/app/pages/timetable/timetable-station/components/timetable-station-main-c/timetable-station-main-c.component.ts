import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { AdsenseModule } from 'ng2-adsense';
import { TimetableSearchCardCComponent } from 'src/app/shared/timetable-search-card/components/timetable-search-card-c/timetable-search-card-c.component';
import { TimetableSearchCardStateStore } from 'src/app/shared/timetable-search-card/states/timetable-search-card.state';
import { TimetableStationStateQuery } from '../../states/timetable-station.state';
import { TimetableStationTableCComponent } from '../timetable-station-table-c/timetable-station-table-c.component';

@Component({
    selector: 'app-timetable-station-main-c',
    templateUrl: './timetable-station-main-c.component.html',
    styleUrls: ['./timetable-station-main-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AdsenseModule,
        TimetableStationTableCComponent,
        TimetableSearchCardCComponent,
    ],
    providers: [RxState],
})
export class TimetableStationMainCComponent {
    readonly #state = inject<RxState<{}>>(RxState);
    readonly #timetableStationStateQuery = inject(TimetableStationStateQuery);
    readonly #timetableSearchCardStateStore = inject(
        TimetableSearchCardStateStore,
    );

    constructor() {
        this.#state.hold(
            this.#timetableStationStateQuery.calendarId$,
            (calendarId) => {
                this.#timetableSearchCardStateStore.setCalendarId(calendarId);
            },
        );

        this.#state.hold(
            this.#timetableStationStateQuery.tripDirection$,
            (tripDirection) => {
                this.#timetableSearchCardStateStore.setTripDirection(
                    tripDirection,
                );
            },
        );

        this.#state.hold(
            this.#timetableStationStateQuery.stationId$,
            (stationId) => {
                this.#timetableSearchCardStateStore.enableSearchByStation();
                this.#timetableSearchCardStateStore.setStationId(stationId);
            },
        );
    }
}
