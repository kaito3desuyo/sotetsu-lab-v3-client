import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarSelectDialogComponent } from './calendar-select-dialog.component';

describe('CalendarSelectDialogComponent', () => {
    let component: CalendarSelectDialogComponent;
    let fixture: ComponentFixture<CalendarSelectDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CalendarSelectDialogComponent],
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
});
