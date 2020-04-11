/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationSightingsSearchFormContainerComponent } from './operation-sightings-search-form-container.component';

describe('OperationSightingsSearchFormContainerComponent', () => {
    let component: OperationSightingsSearchFormContainerComponent;
    let fixture: ComponentFixture<OperationSightingsSearchFormContainerComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [OperationSightingsSearchFormContainerComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationSightingsSearchFormContainerComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
