/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableStationTableContainerComponent } from './timetable-station-table-container.component';

describe('TimetableStationTableContainerComponent', () => {
    let component: TimetableStationTableContainerComponent;
    let fixture: ComponentFixture<TimetableStationTableContainerComponent>;

    beforeEach(async(() => {
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
