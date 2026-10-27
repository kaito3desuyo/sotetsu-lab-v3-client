import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { CalendarListState } from 'src/app/global-states/calendar-list.state';

import { CalendarSelectDialogComponent } from './calendar-select-dialog.component';

describe('CalendarSelectDialogComponent', () => {
    let component: CalendarSelectDialogComponent;
    let fixture: ComponentFixture<CalendarSelectDialogComponent>;
    const dialogRef = { close: jest.fn() };

    beforeEach(async () => {
        dialogRef.close.mockClear();
        await TestBed.configureTestingModule({
            imports: [CalendarSelectDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                {
                    provide: CalendarListState,
                    useValue: { calendars: signal([]) },
                },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CalendarSelectDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('選んだダイヤの ID でダイアログを閉じる', () => {
        component.close('calendar-1');

        expect(dialogRef.close).toHaveBeenCalledWith('calendar-1');
    });

    it('閉じるボタンは何も返さずに閉じる', () => {
        const closeButton: HTMLButtonElement =
            fixture.nativeElement.querySelector('header button');
        closeButton.click();

        expect(dialogRef.close).toHaveBeenCalledWith(undefined);
    });
});
