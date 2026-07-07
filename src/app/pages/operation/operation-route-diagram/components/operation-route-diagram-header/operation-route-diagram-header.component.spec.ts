import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRouteDiagramHeaderComponent } from './operation-route-diagram-header.component';

describe('OperationRouteDiagramHeaderComponent', () => {
    let component: OperationRouteDiagramHeaderComponent;
    let fixture: ComponentFixture<OperationRouteDiagramHeaderComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRouteDiagramHeaderComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(OperationRouteDiagramHeaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
