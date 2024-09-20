import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableStationTablePComponent } from './timetable-station-table-p.component';

describe('TimetableStationTablePComponent', () => {
    let component: TimetableStationTablePComponent;
    let fixture: ComponentFixture<TimetableStationTablePComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [TimetableStationTablePComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(TimetableStationTablePComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
