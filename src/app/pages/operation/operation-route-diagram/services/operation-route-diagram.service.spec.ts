import { TestBed, inject } from '@angular/core/testing';

import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import {
    OperationRouteDiagramStateQuery,
    OperationRouteDiagramStateStore,
} from '../states/operation-route-diagram.state';
import { OperationRouteDiagramService } from './operation-route-diagram.service';

describe('Service: OperationRouteDiagram', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                OperationRouteDiagramService,
                { provide: ServiceService, useValue: {} },
                { provide: OperationService, useValue: {} },
                { provide: ServiceListStateQuery, useValue: {} },
                { provide: OperationRouteDiagramStateStore, useValue: {} },
                { provide: OperationRouteDiagramStateQuery, useValue: {} },
            ],
        });
    });

    it('should ...', inject(
        [OperationRouteDiagramService],
        (service: OperationRouteDiagramService) => {
            expect(service).toBeTruthy();
        },
    ));
});
