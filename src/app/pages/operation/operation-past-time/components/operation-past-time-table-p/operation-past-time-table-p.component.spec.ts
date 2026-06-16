import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationPastTimeTablePComponent } from './operation-past-time-table-p.component';

describe('OperationPastTimeTablePComponent', () => {
    let component: OperationPastTimeTablePComponent;
    let fixture: ComponentFixture<OperationPastTimeTablePComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [OperationPastTimeTablePComponent],
        });
        fixture = TestBed.createComponent(OperationPastTimeTablePComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('calendars', []);
        fixture.componentRef.setInput('formations', []);
        fixture.componentRef.setInput('operationSightings', []);
        fixture.componentRef.setInput('contextMenuDisabled', false);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
