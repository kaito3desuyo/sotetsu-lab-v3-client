import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    templateUrl: './timetable-calendar-select-dialog.component.html',
    styleUrls: ['./timetable-calendar-select-dialog.component.scss'],
})
export class TimetableCalendarSelectDialogComponent implements OnInit {
    calendar: string = '27792766-0031-4b89-9c32-23eea267cbbc';

    constructor(
        public dialogRef: MatDialogRef<TimetableCalendarSelectDialogComponent>
    ) {}

    ngOnInit(): void {}

    clickSelect(): void {
        this.dialogRef.close(this.calendar);
    }
}
