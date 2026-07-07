import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRouteDiagramService } from '../../services/operation-route-diagram.service';
import { OperationRouteDiagramDrawingContainerComponent } from './operation-route-diagram-drawing-container.component';

describe('OperationRouteDiagramDrawingContainerComponent', () => {
    let component: OperationRouteDiagramDrawingContainerComponent;
    let fixture: ComponentFixture<OperationRouteDiagramDrawingContainerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRouteDiagramDrawingContainerComponent],
            providers: [
                {
                    provide: OperationRouteDiagramService,
                    useValue: { emitNavigateTimetableEvent: () => {} },
                },
            ],
        })
            .overrideComponent(OperationRouteDiagramDrawingContainerComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(
            OperationRouteDiagramDrawingContainerComponent,
        );
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
