/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationTableTablePresentationalComponent } from './operation-table-table-presentational.component';

describe('OperationTableTablePresentationalComponent', () => {
    let component: OperationTableTablePresentationalComponent;
    let fixture: ComponentFixture<OperationTableTablePresentationalComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [OperationTableTablePresentationalComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationTableTablePresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
