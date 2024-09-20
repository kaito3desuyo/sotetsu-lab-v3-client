import { Component } from '@angular/core';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { CalendarSelectDialogService } from '../../services/calendar-select-dialog.service';

@Component({
    selector: 'app-calendar-select-dialog-main-c',
    templateUrl: './calendar-select-dialog-main-c.component.html',
    styleUrls: ['./calendar-select-dialog-main-c.component.scss'],
})
export class CalendarSelectDialogMainCComponent {
    readonly calendars$ = this.calendarListStateQuery.calendars$;

    constructor(
        private readonly calendarListStateQuery: CalendarListStateQuery,
        private readonly calendarSelectDialogService: CalendarSelectDialogService,
    ) {}

    onReceiveClickSelect(calendarId: CalendarDetailsDto['calendarId']): void {
        this.calendarSelectDialogService.close(calendarId);
    }
}
