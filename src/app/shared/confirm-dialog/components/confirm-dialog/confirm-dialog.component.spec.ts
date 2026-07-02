import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import {
    ConfirmDialogStateQuery,
    ConfirmDialogStateStore,
} from '../../states/confirm-dialog.state';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
    let component: ConfirmDialogComponent;
    let fixture: ComponentFixture<ConfirmDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ConfirmDialogComponent],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: {} },
            ],
        })
            .overrideComponent(ConfirmDialogComponent, {
                set: {
                    imports: [],
                    schemas: [NO_ERRORS_SCHEMA],
                    providers: [
                        {
                            provide: ConfirmDialogStateStore,
                            useValue: { setData: () => {} },
                        },
                        { provide: ConfirmDialogStateQuery, useValue: {} },
                    ],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(ConfirmDialogComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
