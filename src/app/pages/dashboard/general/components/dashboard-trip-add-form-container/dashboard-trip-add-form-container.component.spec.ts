/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { DashboardTripAddFormContainerComponent } from './dashboard-trip-add-form-container.component';

describe('DashboardTripAddFormContainerComponent', () => {
    let component: DashboardTripAddFormContainerComponent;
    let fixture: ComponentFixture<DashboardTripAddFormContainerComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [DashboardTripAddFormContainerComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            DashboardTripAddFormContainerComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
