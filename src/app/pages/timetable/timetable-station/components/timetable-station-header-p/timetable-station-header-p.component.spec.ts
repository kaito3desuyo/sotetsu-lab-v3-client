import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableStationHeaderPComponent } from './timetable-station-header-p.component';

describe('TimetableStationHeaderPComponent', () => {
    let component: TimetableStationHeaderPComponent;
    let fixture: ComponentFixture<TimetableStationHeaderPComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [TimetableStationHeaderPComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(TimetableStationHeaderPComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
