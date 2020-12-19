/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { DashboardOperationSearchMenuPresentationalComponent } from './dashboard-operation-search-menu-presentational.component';

describe('DashboardOperationSearchMenuPresentationalComponent', () => {
    let component: DashboardOperationSearchMenuPresentationalComponent;
    let fixture: ComponentFixture<DashboardOperationSearchMenuPresentationalComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [DashboardOperationSearchMenuPresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            DashboardOperationSearchMenuPresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
