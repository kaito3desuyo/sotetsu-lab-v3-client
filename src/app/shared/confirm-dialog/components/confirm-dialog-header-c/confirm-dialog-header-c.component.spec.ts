import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';

import { ConfirmDialogStateQuery } from '../../states/confirm-dialog.state';
import { ConfirmDialogHeaderCComponent } from './confirm-dialog-header-c.component';

describe('ConfirmDialogHeaderCComponent', () => {
    let component: ConfirmDialogHeaderCComponent;
    let fixture: ComponentFixture<ConfirmDialogHeaderCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ConfirmDialogHeaderCComponent],
            providers: [
                { provide: ConfirmDialogStateQuery, useValue: { data$: EMPTY } },
            ],
        })
            .overrideComponent(ConfirmDialogHeaderCComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(ConfirmDialogHeaderCComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
