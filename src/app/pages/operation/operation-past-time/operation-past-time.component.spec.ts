/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationPastTimeComponent } from './operation-past-time.component';

describe('OperationPastTimeComponent', () => {
    let component: OperationPastTimeComponent;
    let fixture: ComponentFixture<OperationPastTimeComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [OperationPastTimeComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(OperationPastTimeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
