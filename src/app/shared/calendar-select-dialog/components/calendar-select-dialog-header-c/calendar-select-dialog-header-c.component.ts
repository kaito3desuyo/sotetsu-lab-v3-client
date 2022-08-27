import { Component } from '@angular/core';
import { CalendarSelectDialogService } from '../../services/calendar-select-dialog.service';

@Component({
    selector: 'app-calendar-select-dialog-header-c',
    templateUrl: './calendar-select-dialog-header-c.component.html',
    styleUrls: ['./calendar-select-dialog-header-c.component.scss'],
})
export class CalendarSelectDialogHeaderCComponent {
    constructor(
        private readonly calendarSelectDialogService: CalendarSelectDialogService
    ) {}

    onReceiveClickCloseButton(): void {
        this.calendarSelectDialogService.close();
    }
}
