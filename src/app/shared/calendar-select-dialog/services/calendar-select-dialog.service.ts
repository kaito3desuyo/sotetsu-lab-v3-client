import { Injectable } from '@angular/core';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { CalendarSelectDialogComponent } from '../components/calendar-select-dialog/calendar-select-dialog.component';

@Injectable()
export class CalendarSelectDialogService {
    private _dialogRef: MatDialogRef<
        CalendarSelectDialogComponent,
        CalendarDetailsDto['calendarId']
    >;

    constructor(private readonly dialog: MatDialog) {}

    open(): MatDialogRef<
        CalendarSelectDialogComponent,
        CalendarDetailsDto['calendarId']
    > {
        this._dialogRef = this.dialog.open<
            CalendarSelectDialogComponent,
            {},
            CalendarDetailsDto['calendarId']
        >(CalendarSelectDialogComponent, {
            width: '480px',
            disableClose: true,
        });

        return this._dialogRef;
    }

    close(calendarId?: CalendarDetailsDto['calendarId']): void {
        if (!this._dialogRef) return;
        this._dialogRef.close(calendarId ?? undefined);
    }
}
