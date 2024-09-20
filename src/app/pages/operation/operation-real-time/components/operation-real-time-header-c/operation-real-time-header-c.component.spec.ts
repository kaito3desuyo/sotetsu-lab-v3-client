import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRealTimeHeaderCComponent } from './operation-real-time-header-c.component';

describe('OperationRealTimeHeaderCComponent', () => {
    let component: OperationRealTimeHeaderCComponent;
    let fixture: ComponentFixture<OperationRealTimeHeaderCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [OperationRealTimeHeaderCComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(OperationRealTimeHeaderCComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
