import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationTableHeaderCComponent } from './operation-table-header-c.component';

describe('OperationTableHeaderCComponent', () => {
    let component: OperationTableHeaderCComponent;
    let fixture: ComponentFixture<OperationTableHeaderCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [OperationTableHeaderCComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(OperationTableHeaderCComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
