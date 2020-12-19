import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ConfirmDialogContainerComponent } from './confirm-dialog-container.component';

describe('ConfirmDialogContainerComponent', () => {
    let component: ConfirmDialogContainerComponent;
    let fixture: ComponentFixture<ConfirmDialogContainerComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [ConfirmDialogContainerComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ConfirmDialogContainerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
