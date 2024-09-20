import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRealTimeControlPanelCComponent } from './operation-real-time-control-panel-c.component';

describe('OperationRealTimeControlPanelCComponent', () => {
    let component: OperationRealTimeControlPanelCComponent;
    let fixture: ComponentFixture<OperationRealTimeControlPanelCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeControlPanelCComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(
            OperationRealTimeControlPanelCComponent,
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
