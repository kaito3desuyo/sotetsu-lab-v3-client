/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableAllLinePaginatorContainerComponent } from './timetable-all-line-paginator-container.component';

describe('TimetableAllLinePaginatorContainerComponent', () => {
    let component: TimetableAllLinePaginatorContainerComponent;
    let fixture: ComponentFixture<TimetableAllLinePaginatorContainerComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [TimetableAllLinePaginatorContainerComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            TimetableAllLinePaginatorContainerComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
