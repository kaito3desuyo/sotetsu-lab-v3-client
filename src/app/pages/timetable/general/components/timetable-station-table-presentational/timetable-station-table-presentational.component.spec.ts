/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableStationTablePresentationalComponent } from './timetable-station-table-presentational.component';

describe('TimetableStationTablePresentationalComponent', () => {
    let component: TimetableStationTablePresentationalComponent;
    let fixture: ComponentFixture<TimetableStationTablePresentationalComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [TimetableStationTablePresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            TimetableStationTablePresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
