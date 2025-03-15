import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { CalendarSelectDialogService } from '../../services/calendar-select-dialog.service';
import { CalendarSelectDialogMainPComponent } from '../calendar-select-dialog-main-p/calendar-select-dialog-main-p.component';

@Component({
    selector: 'app-calendar-select-dialog-main-c',
    templateUrl: './calendar-select-dialog-main-c.component.html',
    styleUrls: ['./calendar-select-dialog-main-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CalendarSelectDialogMainPComponent]
})
export class CalendarSelectDialogMainCComponent {
    readonly #calendarListStateQuery = inject(CalendarListStateQuery);
    readonly #calendarSelectDialogService = inject(CalendarSelectDialogService);

    readonly calendars = toSignal(this.#calendarListStateQuery.calendars$);

    onReceiveClickSelect(calendarId: CalendarDetailsDto['calendarId']): void {
        this.#calendarSelectDialogService.close(calendarId);
    }
}
