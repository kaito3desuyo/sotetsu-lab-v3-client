import { Component } from '@angular/core';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { ITimetableSearchCardForm } from '../../interfaces/timetable-search-card-form';
import { TimetableSearchCardService } from '../../services/timetable-search-card.service';
import { TimetableSearchCardStateQuery } from '../../states/timetable-search-card.state';

@Component({
    selector: 'app-timetable-search-card-c',
    templateUrl: './timetable-search-card-c.component.html',
    styleUrls: ['./timetable-search-card-c.component.scss'],
})
export class TimetableSearchCardCComponent {
    readonly calendars$ = this.calendarListStateQuery.calendars$;
    readonly routeStationLists$ =
        this.routeStationListStateQuery.routeStations$;
    readonly currentState$ = this.timetableSearchCardStateQuery.currentState$;

    constructor(
        private readonly calendarListStateQuery: CalendarListStateQuery,
        private readonly routeStationListStateQuery: RouteStationListStateQuery,
        private readonly timetableSearchCardService: TimetableSearchCardService,
        private readonly timetableSearchCardStateQuery: TimetableSearchCardStateQuery
    ) {}

    onReceiveClickSearch(state: ITimetableSearchCardForm): void {
        this.timetableSearchCardService.emitSearchTimetableEvent(state);
    }
}
