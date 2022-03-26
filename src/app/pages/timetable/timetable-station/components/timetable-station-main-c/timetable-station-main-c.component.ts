import { Component } from '@angular/core';
import { mergeMap } from 'rxjs/operators';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { TimetableStationStateQuery } from '../../states/timetable-station.state';

@Component({
    selector: 'app-timetable-station-main-c',
    templateUrl: './timetable-station-main-c.component.html',
    styleUrls: ['./timetable-station-main-c.component.scss'],
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

    constructor(
        private readonly calendarListStateQuery: CalendarListStateQuery,
        private readonly timetableStationStateQuery: TimetableStationStateQuery
    ) {}
}
