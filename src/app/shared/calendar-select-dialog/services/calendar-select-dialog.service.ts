import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { CalendarSelectDialogComponent } from '../calendar-select-dialog.component';

@Injectable({
    providedIn: 'root',
})
export class CalendarSelectDialogService {
    readonly #dialog = inject(MatDialog);

    open(): MatDialogRef<
        CalendarSelectDialogComponent,
        CalendarDetailsDto['calendarId']
    > {
        return this.#dialog.open<
            CalendarSelectDialogComponent,
            {},
            CalendarDetailsDto['calendarId']
        >(CalendarSelectDialogComponent, {
            width: '480px',
            disableClose: true,
        });
    }
}
