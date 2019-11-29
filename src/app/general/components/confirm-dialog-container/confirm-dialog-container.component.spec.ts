import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmDialogContainerComponent } from './confirm-dialog-container.component';

describe('ConfirmDialogContainerComponent', () => {
    let component: ConfirmDialogContainerComponent;
    let fixture: ComponentFixture<ConfirmDialogContainerComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ConfirmDialogContainerComponent]
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
