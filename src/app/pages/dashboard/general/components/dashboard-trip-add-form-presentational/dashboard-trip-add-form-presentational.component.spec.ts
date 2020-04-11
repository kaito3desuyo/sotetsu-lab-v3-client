/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { DashboardTripAddFormPresentationalComponent } from './dashboard-trip-add-form-presentational.component';

describe('DashboardTripAddFormPresentationalComponent', () => {
    let component: DashboardTripAddFormPresentationalComponent;
    let fixture: ComponentFixture<DashboardTripAddFormPresentationalComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [DashboardTripAddFormPresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            DashboardTripAddFormPresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
