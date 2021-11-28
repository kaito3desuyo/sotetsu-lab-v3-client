import { Component } from '@angular/core';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { ITimetablePostCardForm } from '../../interfaces/timetable-post-card-form.interface';
import { TimetablePostCardService } from '../../services/timetable-post-card.service';

@Component({
    selector: 'app-timetable-post-card-c',
    templateUrl: './timetable-post-card-c.component.html',
    styleUrls: ['./timetable-post-card-c.component.scss'],
})
export class TimetablePostCardCComponent {
    readonly calendars$ = this.calendarListStateQuery.calendars$;

    constructor(
        private readonly calendarListStateQuery: CalendarListStateQuery,
        private readonly timetablePostCardService: TimetablePostCardService
    ) {}

    onReceiveClickMoveTimetableAdd(state: ITimetablePostCardForm): void {
        this.timetablePostCardService.emitMoveTimetableAddEvent(state);
    }
}
