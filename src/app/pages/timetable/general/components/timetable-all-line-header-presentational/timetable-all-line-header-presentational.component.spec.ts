/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableAllLineHeaderPresentationalComponent } from './timetable-all-line-header-presentational.component';

describe('TimetableAllLineHeaderPresentationalComponent', () => {
    let component: TimetableAllLineHeaderPresentationalComponent;
    let fixture: ComponentFixture<TimetableAllLineHeaderPresentationalComponent>;

    beforeEach(async(() => {
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
