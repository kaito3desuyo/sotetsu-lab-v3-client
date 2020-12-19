/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationRouteDiagramDrawingContainerComponent } from './operation-route-diagram-drawing-container.component';

describe('OperationRouteDiagramDrawingContainerComponent', () => {
    let component: OperationRouteDiagramDrawingContainerComponent;
    let fixture: ComponentFixture<OperationRouteDiagramDrawingContainerComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [OperationRouteDiagramDrawingContainerComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationRouteDiagramDrawingContainerComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
