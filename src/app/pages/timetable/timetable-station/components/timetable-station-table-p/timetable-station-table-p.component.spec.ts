import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableStationTablePComponent } from './timetable-station-table-p.component';

describe('TimetableStationTablePComponent', () => {
    let component: TimetableStationTablePComponent;
    let fixture: ComponentFixture<TimetableStationTablePComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableStationTablePComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(TimetableStationTablePComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('calendar', {} as any);
        fixture.componentRef.setInput('stationName', '');
        fixture.componentRef.setInput('tripDirection', 0);
        fixture.componentRef.setInput('tripClasses', []);
        fixture.componentRef.setInput('stations', []);
        fixture.componentRef.setInput('timetableData', []);
        fixture.componentRef.setInput('operations', []);
        fixture.componentRef.setInput('operationSightingTimeCrossSections', []);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
