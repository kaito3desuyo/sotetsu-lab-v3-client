/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationSightingsTableLegendPresentationalComponent } from './operation-sightings-table-legend-presentational.component';

describe('OperationSightingsTableLegendPresentationalComponent', () => {
    let component: OperationSightingsTableLegendPresentationalComponent;
    let fixture: ComponentFixture<OperationSightingsTableLegendPresentationalComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [OperationSightingsTableLegendPresentationalComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationSightingsTableLegendPresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
