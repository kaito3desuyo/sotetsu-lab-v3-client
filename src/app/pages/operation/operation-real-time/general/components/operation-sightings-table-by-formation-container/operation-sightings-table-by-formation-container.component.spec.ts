/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationSightingsTableByFormationContainerComponent } from './operation-sightings-table-by-formation-container.component';

describe('OperationSightingsTableByFormationContainerComponent', () => {
    let component: OperationSightingsTableByFormationContainerComponent;
    let fixture: ComponentFixture<OperationSightingsTableByFormationContainerComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [OperationSightingsTableByFormationContainerComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationSightingsTableByFormationContainerComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
