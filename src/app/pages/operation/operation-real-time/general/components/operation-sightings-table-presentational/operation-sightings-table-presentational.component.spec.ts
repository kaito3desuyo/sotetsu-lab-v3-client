/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationSightingsTablePresentationalComponent } from './operation-sightings-table-presentational.component';

describe('OperationSightingsTablePresentationalComponent', () => {
    let component: OperationSightingsTablePresentationalComponent;
    let fixture: ComponentFixture<OperationSightingsTablePresentationalComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [OperationSightingsTablePresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationSightingsTablePresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
