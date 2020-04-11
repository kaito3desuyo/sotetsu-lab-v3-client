/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableSearchFormPresentationalComponent } from './timetable-search-form-presentational.component';

describe('TimetableSearchFormPresentationalComponent', () => {
    let component: TimetableSearchFormPresentationalComponent;
    let fixture: ComponentFixture<TimetableSearchFormPresentationalComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [TimetableSearchFormPresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            TimetableSearchFormPresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
