import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { OperationTableSearchFormPresentationalComponent } from './operation-table-search-form-presentational.component';

describe('OperationTableSearchFormPresentationalComponent', () => {
    let component: OperationTableSearchFormPresentationalComponent;
    let fixture: ComponentFixture<OperationTableSearchFormPresentationalComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [OperationTableSearchFormPresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationTableSearchFormPresentationalComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
