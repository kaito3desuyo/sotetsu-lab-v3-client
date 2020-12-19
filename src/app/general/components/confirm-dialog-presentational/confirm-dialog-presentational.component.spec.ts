import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ConfirmDialogPresentationalComponent } from './confirm-dialog-presentational.component';

describe('ConfirmDialogPresentationalComponent', () => {
    let component: ConfirmDialogPresentationalComponent;
    let fixture: ComponentFixture<ConfirmDialogPresentationalComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [ConfirmDialogPresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ConfirmDialogPresentationalComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
