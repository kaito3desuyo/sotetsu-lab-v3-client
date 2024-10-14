import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { CalendarSelectDialogComponent } from '../components/calendar-select-dialog/calendar-select-dialog.component';

@Injectable({
    providedIn: 'root',
})
export class CalendarSelectDialogService {
    readonly #dialog = inject(MatDialog);
    #dialogRef: MatDialogRef<
        CalendarSelectDialogComponent,
        CalendarDetailsDto['calendarId']
    >;

    open(): MatDialogRef<
        CalendarSelectDialogComponent,
        CalendarDetailsDto['calendarId']
    > {
        this.#dialogRef = this.#dialog.open<
            CalendarSelectDialogComponent,
            {},
            CalendarDetailsDto['calendarId']
        >(CalendarSelectDialogComponent, {
            width: '480px',
            disableClose: true,
        });

        return this.#dialogRef;
    }

    close(calendarId?: CalendarDetailsDto['calendarId']): void {
        this.#dialogRef.close(calendarId ?? undefined);
    }
}
