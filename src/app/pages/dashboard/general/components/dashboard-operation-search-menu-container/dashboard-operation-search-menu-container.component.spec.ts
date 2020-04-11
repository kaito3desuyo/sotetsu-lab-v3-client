/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { DashboardOperationSearchMenuContainerComponent } from './dashboard-operation-search-menu-container.component';

describe('DashboardOperationSearchMenuContainerComponent', () => {
    let component: DashboardOperationSearchMenuContainerComponent;
    let fixture: ComponentFixture<DashboardOperationSearchMenuContainerComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [DashboardOperationSearchMenuContainerComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            DashboardOperationSearchMenuContainerComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
