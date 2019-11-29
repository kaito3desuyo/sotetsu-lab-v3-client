import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmDialogPresentationalComponent } from './confirm-dialog-presentational.component';

describe('ConfirmDialogPresentationalComponent', () => {
    let component: ConfirmDialogPresentationalComponent;
    let fixture: ComponentFixture<ConfirmDialogPresentationalComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ConfirmDialogPresentationalComponent]
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
