/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableStationTableContainerComponent } from './timetable-station-table-container.component';

describe('TimetableStationTableContainerComponent', () => {
    let component: TimetableStationTableContainerComponent;
    let fixture: ComponentFixture<TimetableStationTableContainerComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [TimetableStationTableContainerComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            TimetableStationTableContainerComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
