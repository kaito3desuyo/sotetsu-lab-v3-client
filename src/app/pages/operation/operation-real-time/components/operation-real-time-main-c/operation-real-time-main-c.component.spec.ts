import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRealTimeMainCComponent } from './operation-real-time-main-c.component';

describe('OperationRealTimeMainCComponent', () => {
    let component: OperationRealTimeMainCComponent;
    let fixture: ComponentFixture<OperationRealTimeMainCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [OperationRealTimeMainCComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(OperationRealTimeMainCComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
