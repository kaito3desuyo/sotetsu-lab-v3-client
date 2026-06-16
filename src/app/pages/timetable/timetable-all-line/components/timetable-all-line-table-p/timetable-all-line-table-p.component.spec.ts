import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableAllLineTablePComponent } from './timetable-all-line-table-p.component';

describe('TimetableAllLineTablePComponent', () => {
    let component: TimetableAllLineTablePComponent;
    let fixture: ComponentFixture<TimetableAllLineTablePComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineTablePComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(TimetableAllLineTablePComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('calendar', {} as any);
        fixture.componentRef.setInput('tripDirection', 0);
        fixture.componentRef.setInput('stations', []);
        fixture.componentRef.setInput('trips', []);
        fixture.componentRef.setInput('pageSettings', {} as any);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
