import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CalendarSelectDialogService } from '../../services/calendar-select-dialog.service';
import { CalendarSelectDialogHeaderPComponent } from '../calendar-select-dialog-header-p/calendar-select-dialog-header-p.component';

@Component({
    standalone: true,
    selector: 'app-calendar-select-dialog-header-c',
    templateUrl: './calendar-select-dialog-header-c.component.html',
    styleUrls: ['./calendar-select-dialog-header-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CalendarSelectDialogHeaderPComponent],
})
export class CalendarSelectDialogHeaderCComponent {
    readonly #calendarSelectDialogService = inject(CalendarSelectDialogService);

    onReceiveClickCloseButton(): void {
        this.#calendarSelectDialogService.close();
    }
}
