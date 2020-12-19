import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { OperationRouteDiagramSearchFormContainerComponent } from './operation-route-diagram-search-form-container.component';

describe('OperationRouteDiagramSearchFormContainerComponent', () => {
    let component: OperationRouteDiagramSearchFormContainerComponent;
    let fixture: ComponentFixture<OperationRouteDiagramSearchFormContainerComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [OperationRouteDiagramSearchFormContainerComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationRouteDiagramSearchFormContainerComponent
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
