/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationRouteDiagramDrawingPresentationalComponent } from './operation-route-diagram-drawing-presentational.component';

describe('OperationRouteDiagramDrawingPresentationalComponent', () => {
    let component: OperationRouteDiagramDrawingPresentationalComponent;
    let fixture: ComponentFixture<OperationRouteDiagramDrawingPresentationalComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [OperationRouteDiagramDrawingPresentationalComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationRouteDiagramDrawingPresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
