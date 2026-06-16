import { TestBed, inject } from '@angular/core/testing';

import { OperationRouteDiagramStateStore } from '../states/operation-route-diagram.state';
import { OperationRouteDiagramService } from './operation-route-diagram.service';
import { OperationRouteDiagramResolverService } from './operation-route-diagram-resolver.service';

describe('Service: OperationRouteDiagramResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                OperationRouteDiagramResolverService,
                { provide: OperationRouteDiagramService, useValue: {} },
                { provide: OperationRouteDiagramStateStore, useValue: {} },
            ],
        });
    });

    it('should ...', inject(
        [OperationRouteDiagramResolverService],
        (service: OperationRouteDiagramResolverService) => {
            expect(service).toBeTruthy();
        },
    ));
});
