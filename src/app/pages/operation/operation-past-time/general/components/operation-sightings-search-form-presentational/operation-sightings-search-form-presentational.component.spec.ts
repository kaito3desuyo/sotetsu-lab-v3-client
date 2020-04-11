/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationSightingsSearchFormPresentationalComponent } from './operation-sightings-search-form-presentational.component';

describe('OperationSightingsSearchFormPresentationalComponent', () => {
    let component: OperationSightingsSearchFormPresentationalComponent;
    let fixture: ComponentFixture<OperationSightingsSearchFormPresentationalComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [OperationSightingsSearchFormPresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationSightingsSearchFormPresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
