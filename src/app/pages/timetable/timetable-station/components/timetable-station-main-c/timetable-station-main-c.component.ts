import { Component } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { mergeMap } from 'rxjs/operators';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { TimetableSearchCardStateStore } from 'src/app/shared/timetable-search-card/states/timetable-search-card.state';
import { TimetableStationStateQuery } from '../../states/timetable-station.state';

@Component({
    selector: 'app-timetable-station-main-c',
    templateUrl: './timetable-station-main-c.component.html',
    styleUrls: ['./timetable-station-main-c.component.scss'],
    providers: [RxState],
})
export class TimetableStationMainCComponent {
    readonly calendar$ = this.timetableStationStateQuery.calendarId$.pipe(
        mergeMap((id) => this.calendarListStateQuery.selectByCalendarId(id))
    );
    readonly stationName$ = this.timetableStationStateQuery.stationName$;
    readonly tripDirection$ = this.timetableStationStateQuery.tripDirection$;
    readonly tripClasses$ = this.timetableStationStateQuery.tripClasses$;
    readonly stations$ = this.timetableStationStateQuery.stations$;
    readonly timetableData$ = this.timetableStationStateQuery.timetableData$;
    readonly operations$ = this.timetableStationStateQuery.operations$;
    readonly formations$ = this.timetableStationStateQuery.formations$;
    readonly latestSightings$ =
        this.timetableStationStateQuery.latestSightings$;

    constructor(
        private readonly state: RxState<{}>,
        private readonly calendarListStateQuery: CalendarListStateQuery,
        private readonly timetableStationStateQuery: TimetableStationStateQuery,
        private readonly timetableSearchCardStateStore: TimetableSearchCardStateStore
    ) {
        this.state.hold(
            this.timetableStationStateQuery.calendarId$,
            (calendarId) => {
                this.timetableSearchCardStateStore.setCalendarId(calendarId);
            }
        );

        this.state.hold(
            this.timetableStationStateQuery.tripDirection$,
            (tripDirection) => {
                this.timetableSearchCardStateStore.setTripDirection(
                    tripDirection
                );
            }
        );

        this.state.hold(
            this.timetableStationStateQuery.stationId$,
            (stationId) => {
                this.timetableSearchCardStateStore.enableSearchByStation();
                this.timetableSearchCardStateStore.setStationId(stationId);
            }
        );
    }
}
