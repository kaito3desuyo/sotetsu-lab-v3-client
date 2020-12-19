/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableStationHeaderPresentationalComponent } from './timetable-station-header-presentational.component';

describe('TimetableStationHeaderPresentationalComponent', () => {
    let component: TimetableStationHeaderPresentationalComponent;
    let fixture: ComponentFixture<TimetableStationHeaderPresentationalComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [TimetableStationHeaderPresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            TimetableStationHeaderPresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
