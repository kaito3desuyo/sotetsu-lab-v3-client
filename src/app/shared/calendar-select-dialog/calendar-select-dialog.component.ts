import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';

@Component({
    selector: 'app-calendar-select-dialog',
    templateUrl: './calendar-select-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatSelectModule,
        DateFnsPipe,
    ],
})
export class CalendarSelectDialogComponent {
    readonly #dialogRef =
        inject<
            MatDialogRef<
                CalendarSelectDialogComponent,
                CalendarDetailsDto['calendarId']
            >
        >(MatDialogRef);

    readonly calendars = toSignal(inject(CalendarListStateQuery).calendars$);

    selected: CalendarDetailsDto['calendarId'] = undefined;

    close(calendarId?: CalendarDetailsDto['calendarId']): void {
        this.#dialogRef.close(calendarId);
    }
}
