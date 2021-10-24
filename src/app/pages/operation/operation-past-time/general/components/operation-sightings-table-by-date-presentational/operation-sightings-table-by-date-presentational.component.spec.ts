/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationSightingsTableByDatePresentationalComponent } from './operation-sightings-table-by-date-presentational.component';

describe('OperationSightingsTableByDatePresentationalComponent', () => {
    let component: OperationSightingsTableByDatePresentationalComponent;
    let fixture: ComponentFixture<OperationSightingsTableByDatePresentationalComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                OperationSightingsTableByDatePresentationalComponent,
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationSightingsTableByDatePresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
