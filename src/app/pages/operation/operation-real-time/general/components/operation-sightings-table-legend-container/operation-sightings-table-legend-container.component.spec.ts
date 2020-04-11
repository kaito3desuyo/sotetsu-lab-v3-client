/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationSightingsTableLegendContainerComponent } from './operation-sightings-table-legend-container.component';

describe('OperationSightingsTableLegendContainerComponent', () => {
    let component: OperationSightingsTableLegendContainerComponent;
    let fixture: ComponentFixture<OperationSightingsTableLegendContainerComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [OperationSightingsTableLegendContainerComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationSightingsTableLegendContainerComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
