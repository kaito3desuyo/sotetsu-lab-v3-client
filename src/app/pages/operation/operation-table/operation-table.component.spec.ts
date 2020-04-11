/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationTableComponent } from './operation-table.component';

describe('OperationTableComponent', () => {
    let component: OperationTableComponent;
    let fixture: ComponentFixture<OperationTableComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [OperationTableComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(OperationTableComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
