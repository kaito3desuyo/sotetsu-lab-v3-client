/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { OperationRouteDiagramResolverService } from './operation-route-diagram-resolver.service';

describe('Service: OperationRouteDiagramResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [OperationRouteDiagramResolverService],
        });
    });

    it('should ...', inject(
        [OperationRouteDiagramResolverService],
        (service: OperationRouteDiagramResolverService) => {
            expect(service).toBeTruthy();
        }
    ));
});
