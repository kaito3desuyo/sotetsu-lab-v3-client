import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { ITimetablePostCardForm } from '../../interfaces/timetable-post-card-form.interface';
import { TimetablePostCardService } from '../../services/timetable-post-card.service';
import { TimetablePostCardPComponent } from '../timetable-post-card-p/timetable-post-card-p.component';

@Component({
    standalone: true,
    selector: 'app-timetable-post-card-c',
    templateUrl: './timetable-post-card-c.component.html',
    styleUrls: ['./timetable-post-card-c.component.scss'],
    imports: [CommonModule, TimetablePostCardPComponent],
})
export class TimetablePostCardCComponent {
    private readonly calendarListStateQuery = inject(CalendarListStateQuery);
    private readonly timetablePostCardService = inject(
        TimetablePostCardService,
    );

    readonly calendars$ = this.calendarListStateQuery.calendars$;

    onReceiveClickMoveTimetableAdd(state: ITimetablePostCardForm): void {
        this.timetablePostCardService.emitMoveTimetableAddEvent(state);
    }
}
