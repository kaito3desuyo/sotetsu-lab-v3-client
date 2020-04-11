/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableUpdateComponent } from './timetable-update.component';

describe('TimetableUpdateComponent', () => {
    let component: TimetableUpdateComponent;
    let fixture: ComponentFixture<TimetableUpdateComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [TimetableUpdateComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(TimetableUpdateComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
