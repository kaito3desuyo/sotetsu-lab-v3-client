import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationPastTimeHeaderPComponent } from './operation-past-time-header-p.component';

describe('OperationPastTimeHeaderPComponent', () => {
    let component: OperationPastTimeHeaderPComponent;
    let fixture: ComponentFixture<OperationPastTimeHeaderPComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [OperationPastTimeHeaderPComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(OperationPastTimeHeaderPComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
