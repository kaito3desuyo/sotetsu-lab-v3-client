import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationPastTimeHeaderCComponent } from './operation-past-time-header-c.component';

describe('OperationPastTimeHeaderCComponent', () => {
    let component: OperationPastTimeHeaderCComponent;
    let fixture: ComponentFixture<OperationPastTimeHeaderCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [OperationPastTimeHeaderCComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(OperationPastTimeHeaderCComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
