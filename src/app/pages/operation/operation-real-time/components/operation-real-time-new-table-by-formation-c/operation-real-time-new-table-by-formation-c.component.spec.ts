import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRealTimeNewTableByFormationCComponent } from './operation-real-time-new-table-by-formation-c.component';

describe('OperationRealTimeNewTableByFormationCComponent', () => {
    let component: OperationRealTimeNewTableByFormationCComponent;
    let fixture: ComponentFixture<OperationRealTimeNewTableByFormationCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeNewTableByFormationCComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(
            OperationRealTimeNewTableByFormationCComponent,
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
