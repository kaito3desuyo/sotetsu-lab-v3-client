/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableAddModeSelectPresentationalComponent } from './timetable-add-mode-select-presentational.component';

describe('TimetableAddModeSelectPresentationalComponent', () => {
    let component: TimetableAddModeSelectPresentationalComponent;
    let fixture: ComponentFixture<TimetableAddModeSelectPresentationalComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [TimetableAddModeSelectPresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            TimetableAddModeSelectPresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
