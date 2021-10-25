/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableAllLineHeaderPresentationalComponent } from './timetable-all-line-header-presentational.component';

describe('TimetableAllLineHeaderPresentationalComponent', () => {
    let component: TimetableAllLineHeaderPresentationalComponent;
    let fixture: ComponentFixture<TimetableAllLineHeaderPresentationalComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [TimetableAllLineHeaderPresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            TimetableAllLineHeaderPresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
