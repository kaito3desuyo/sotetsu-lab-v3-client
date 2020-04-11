/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationSightingAddFormPresentationalComponent } from './operation-sighting-add-form-presentational.component';

describe('OperationSightingAddFormPresentationalComponent', () => {
    let component: OperationSightingAddFormPresentationalComponent;
    let fixture: ComponentFixture<OperationSightingAddFormPresentationalComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [OperationSightingAddFormPresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationSightingAddFormPresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
