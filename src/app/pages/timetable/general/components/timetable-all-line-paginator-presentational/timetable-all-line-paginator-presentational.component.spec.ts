/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableAllLinePaginatorPresentationalComponent } from './timetable-all-line-paginator-presentational.component';

describe('TimetableAllLinePaginatorPresentationalComponent', () => {
    let component: TimetableAllLinePaginatorPresentationalComponent;
    let fixture: ComponentFixture<TimetableAllLinePaginatorPresentationalComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [TimetableAllLinePaginatorPresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            TimetableAllLinePaginatorPresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
