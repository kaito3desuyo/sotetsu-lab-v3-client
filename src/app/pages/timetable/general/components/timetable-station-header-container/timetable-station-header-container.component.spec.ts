/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableStationHeaderContainerComponent } from './timetable-station-header-container.component';

describe('TimetableStationHeaderContainerComponent', () => {
    let component: TimetableStationHeaderContainerComponent;
    let fixture: ComponentFixture<TimetableStationHeaderContainerComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [TimetableStationHeaderContainerComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            TimetableStationHeaderContainerComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
