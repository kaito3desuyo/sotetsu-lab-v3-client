/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableAddModeSelectContainerComponent } from './timetable-add-mode-select-container.component';

describe('TimetableAddModeSelectContainerComponent', () => {
    let component: TimetableAddModeSelectContainerComponent;
    let fixture: ComponentFixture<TimetableAddModeSelectContainerComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [TimetableAddModeSelectContainerComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            TimetableAddModeSelectContainerComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
