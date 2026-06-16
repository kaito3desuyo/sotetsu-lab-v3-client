import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';

import { OperationRouteDiagramService } from '../../services/operation-route-diagram.service';
import { OperationRouteDiagramStateQuery } from '../../states/operation-route-diagram.state';
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
                {
                    provide: OperationRouteDiagramStateQuery,
                    useValue: {
                        calendar$: EMPTY,
                        operation$: EMPTY,
                        tripOperationLists$: EMPTY,
                        stations$: EMPTY,
                        operationId$: EMPTY,
                    },
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
