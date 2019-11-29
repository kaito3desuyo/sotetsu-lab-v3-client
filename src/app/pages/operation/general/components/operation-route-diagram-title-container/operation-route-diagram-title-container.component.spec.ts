/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationRouteDiagramTitleContainerComponent } from './operation-route-diagram-title-container.component';

describe('OperationRouteDiagramTitleContainerComponent', () => {
    let component: OperationRouteDiagramTitleContainerComponent;
    let fixture: ComponentFixture<OperationRouteDiagramTitleContainerComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [OperationRouteDiagramTitleContainerComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationRouteDiagramTitleContainerComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
