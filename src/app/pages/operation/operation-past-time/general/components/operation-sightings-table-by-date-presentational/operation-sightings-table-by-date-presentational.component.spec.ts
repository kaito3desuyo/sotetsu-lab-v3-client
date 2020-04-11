/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationSightingsTableByDatePresentationalComponent } from './operation-sightings-table-by-date-presentational.component';

describe('OperationSightingsTableByDatePresentationalComponent', () => {
    let component: OperationSightingsTableByDatePresentationalComponent;
    let fixture: ComponentFixture<OperationSightingsTableByDatePresentationalComponent>;

    beforeEach(async(() => {
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
