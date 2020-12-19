/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { CalendarCardHeaderPresentationalComponent } from './calendar-card-header-presentational.component';

describe('CalendarCardHeaderPresentationalComponent', () => {
    let component: CalendarCardHeaderPresentationalComponent;
    let fixture: ComponentFixture<CalendarCardHeaderPresentationalComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [CalendarCardHeaderPresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            CalendarCardHeaderPresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
