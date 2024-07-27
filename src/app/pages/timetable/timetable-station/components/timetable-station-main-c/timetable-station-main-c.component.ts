import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RxState } from '@rx-angular/state';
import { AdsenseModule } from 'ng2-adsense';
import { mergeMap } from 'rxjs/operators';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { TimetableSearchCardCComponent } from 'src/app/shared/timetable-search-card/components/timetable-search-card-c/timetable-search-card-c.component';
import { TimetableSearchCardStateStore } from 'src/app/shared/timetable-search-card/states/timetable-search-card.state';
import { TimetableStationStateQuery } from '../../states/timetable-station.state';
import { TimetableStationTablePComponent } from '../timetable-station-table-p/timetable-station-table-p.component';

@Component({
    standalone: true,
    selector: 'app-timetable-station-main-c',
    templateUrl: './timetable-station-main-c.component.html',
    styleUrls: ['./timetable-station-main-c.component.scss'],
    imports: [
        AdsenseModule,
        TimetableStationTablePComponent,
        TimetableSearchCardCComponent,
    ],
    providers: [RxState],
})
export class TimetableStationMainCComponent {
    readonly #state = inject<RxState<{}>>(RxState);
    readonly #calendarListStateQuery = inject(CalendarListStateQuery);
    readonly #timetableStationStateQuery = inject(TimetableStationStateQuery);
    readonly #timetableSearchCardStateStore = inject(
        TimetableSearchCardStateStore
    );

    readonly calendar = toSignal(
        this.#timetableStationStateQuery.calendarId$.pipe(
            mergeMap((id) =>
                this.#calendarListStateQuery.selectByCalendarId(id)
            )
        )
    );
    readonly stationName = toSignal(
        this.#timetableStationStateQuery.stationName$
    );
    readonly tripDirection = toSignal(
        this.#timetableStationStateQuery.tripDirection$
    );
    readonly tripClasses = toSignal(
        this.#timetableStationStateQuery.tripClasses$
    );
    readonly stations = toSignal(this.#timetableStationStateQuery.stations$);
    readonly timetableData = toSignal(
        this.#timetableStationStateQuery.timetableData$
    );
    readonly operations = toSignal(
        this.#timetableStationStateQuery.operations$
    );
    readonly operationSightingTimeCrossSections = toSignal(
        this.#timetableStationStateQuery.operationSightingTimeCrossSections$
    );

    constructor() {
        this.#state.hold(
            this.#timetableStationStateQuery.calendarId$,
            (calendarId) => {
                this.#timetableSearchCardStateStore.setCalendarId(calendarId);
            }
        );

        this.#state.hold(
            this.#timetableStationStateQuery.tripDirection$,
            (tripDirection) => {
                this.#timetableSearchCardStateStore.setTripDirection(
                    tripDirection
                );
            }
        );

        this.#state.hold(
            this.#timetableStationStateQuery.stationId$,
            (stationId) => {
                this.#timetableSearchCardStateStore.enableSearchByStation();
                this.#timetableSearchCardStateStore.setStationId(stationId);
            }
        );
    }
}
