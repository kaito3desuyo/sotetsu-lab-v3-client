import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CalendarSelectDialogHeaderCComponent } from '../calendar-select-dialog-header-c/calendar-select-dialog-header-c.component';
import { CalendarSelectDialogMainCComponent } from '../calendar-select-dialog-main-c/calendar-select-dialog-main-c.component';

@Component({
    selector: 'app-calendar-select-dialog',
    templateUrl: './calendar-select-dialog.component.html',
    styleUrls: ['./calendar-select-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CalendarSelectDialogHeaderCComponent,
        CalendarSelectDialogMainCComponent,
    ]
})
export class CalendarSelectDialogComponent {}
