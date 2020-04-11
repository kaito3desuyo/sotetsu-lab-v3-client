/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableEditorFormContainerComponent } from './timetable-editor-form-container.component';

describe('TimetableEditorFormContainerComponent', () => {
    let component: TimetableEditorFormContainerComponent;
    let fixture: ComponentFixture<TimetableEditorFormContainerComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [TimetableEditorFormContainerComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            TimetableEditorFormContainerComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
