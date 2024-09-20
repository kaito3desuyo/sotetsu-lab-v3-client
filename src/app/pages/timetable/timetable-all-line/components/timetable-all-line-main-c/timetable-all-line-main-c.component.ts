import { Component } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { TimetableSearchCardStateStore } from 'src/app/shared/timetable-search-card/states/timetable-search-card.state';
import { TimetableAllLineStateQuery } from '../../states/timetable-all-line.state';

@Component({
    selector: 'app-timetable-all-line-main-c',
    templateUrl: './timetable-all-line-main-c.component.html',
    styleUrls: ['./timetable-all-line-main-c.component.scss'],
    providers: [RxState],
})
export class TimetableAllLineMainCComponent {
    constructor(
        private readonly state: RxState<{}>,
        private readonly timetableAllLineStateQuery: TimetableAllLineStateQuery,
        private readonly timetableSearchCardStateStore: TimetableSearchCardStateStore,
    ) {
        this.state.hold(
            this.timetableAllLineStateQuery.calendarId$,
            (calendarId) => {
                this.timetableSearchCardStateStore.setCalendarId(calendarId);
            },
        );

        this.state.hold(
            this.timetableAllLineStateQuery.tripDirection$,
            (tripDirection) => {
                this.timetableSearchCardStateStore.setTripDirection(
                    tripDirection,
                );
            },
        );
    }
}
