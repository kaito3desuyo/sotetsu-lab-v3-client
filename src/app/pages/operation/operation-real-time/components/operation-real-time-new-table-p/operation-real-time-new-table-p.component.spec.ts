import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRealTimeNewTablePComponent } from './operation-real-time-new-table-p.component';

describe('OperationRealTimeNewTablePComponent', () => {
    let component: OperationRealTimeNewTablePComponent;
    let fixture: ComponentFixture<OperationRealTimeNewTablePComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeNewTablePComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(OperationRealTimeNewTablePComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
