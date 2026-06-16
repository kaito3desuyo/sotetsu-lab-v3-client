import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';

import { ConfirmDialogStateQuery } from '../../states/confirm-dialog.state';
import { ConfirmDialogMainCComponent } from './confirm-dialog-main-c.component';

describe('ConfirmDialogMainCComponent', () => {
    let component: ConfirmDialogMainCComponent;
    let fixture: ComponentFixture<ConfirmDialogMainCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ConfirmDialogMainCComponent],
            providers: [
                { provide: ConfirmDialogStateQuery, useValue: { data$: EMPTY } },
            ],
        })
            .overrideComponent(ConfirmDialogMainCComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(ConfirmDialogMainCComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
