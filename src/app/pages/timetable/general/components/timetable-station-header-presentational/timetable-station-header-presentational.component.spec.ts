/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableStationHeaderPresentationalComponent } from './timetable-station-header-presentational.component';

describe('TimetableStationHeaderPresentationalComponent', () => {
    let component: TimetableStationHeaderPresentationalComponent;
    let fixture: ComponentFixture<TimetableStationHeaderPresentationalComponent>;

    beforeEach(async(() => {
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
