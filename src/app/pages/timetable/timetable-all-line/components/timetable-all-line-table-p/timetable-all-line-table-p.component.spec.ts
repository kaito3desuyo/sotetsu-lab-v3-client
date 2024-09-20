import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableAllLineTablePComponent } from './timetable-all-line-table-p.component';

describe('TimetableAllLineTablePComponent', () => {
    let component: TimetableAllLineTablePComponent;
    let fixture: ComponentFixture<TimetableAllLineTablePComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [TimetableAllLineTablePComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(TimetableAllLineTablePComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
