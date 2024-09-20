import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmDialogMainCComponent } from './confirm-dialog-main-c.component';

describe('ConfirmDialogMainCComponent', () => {
    let component: ConfirmDialogMainCComponent;
    let fixture: ComponentFixture<ConfirmDialogMainCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ConfirmDialogMainCComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ConfirmDialogMainCComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
