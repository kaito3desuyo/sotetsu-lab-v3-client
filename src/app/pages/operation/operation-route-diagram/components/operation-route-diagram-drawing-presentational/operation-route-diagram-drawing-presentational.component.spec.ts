/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationRouteDiagramDrawingPresentationalComponent } from './operation-route-diagram-drawing-presentational.component';

describe('OperationRouteDiagramDrawingPresentationalComponent', () => {
    let component: OperationRouteDiagramDrawingPresentationalComponent;
    let fixture: ComponentFixture<OperationRouteDiagramDrawingPresentationalComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [OperationRouteDiagramDrawingPresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationRouteDiagramDrawingPresentationalComponent,
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
