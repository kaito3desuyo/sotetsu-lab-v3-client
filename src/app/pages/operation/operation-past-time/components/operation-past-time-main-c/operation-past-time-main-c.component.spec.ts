import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationPastTimeMainCComponent } from './operation-past-time-main-c.component';

describe('OperationPastTimeMainCComponent', () => {
    let component: OperationPastTimeMainCComponent;
    let fixture: ComponentFixture<OperationPastTimeMainCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [OperationPastTimeMainCComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(OperationPastTimeMainCComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
