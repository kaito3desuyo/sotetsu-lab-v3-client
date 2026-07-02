import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarSelectDialogMainPComponent } from './calendar-select-dialog-main-p.component';

describe('CalendarSelectDialogMainPComponent', () => {
    let component: CalendarSelectDialogMainPComponent;
    let fixture: ComponentFixture<CalendarSelectDialogMainPComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CalendarSelectDialogMainPComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CalendarSelectDialogMainPComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('calendars', []);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
