/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationTableTitlePresentationalComponent } from './operation-table-title-presentational.component';

describe('OperationTableTitlePresentationalComponent', () => {
    let component: OperationTableTitlePresentationalComponent;
    let fixture: ComponentFixture<OperationTableTitlePresentationalComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [OperationTableTitlePresentationalComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationTableTitlePresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
