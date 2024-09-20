import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarSelectDialogHeaderCComponent } from './calendar-select-dialog-header-c.component';

describe('CalendarSelectDialogHeaderCComponent', () => {
    let component: CalendarSelectDialogHeaderCComponent;
    let fixture: ComponentFixture<CalendarSelectDialogHeaderCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CalendarSelectDialogHeaderCComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CalendarSelectDialogHeaderCComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
