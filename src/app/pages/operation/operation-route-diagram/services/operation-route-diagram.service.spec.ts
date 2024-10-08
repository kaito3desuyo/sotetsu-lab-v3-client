/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { OperationRouteDiagramService } from './operation-route-diagram.service';

describe('Service: OperationRouteDiagram', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [OperationRouteDiagramService],
        });
    });

    it('should ...', inject(
        [OperationRouteDiagramService],
        (service: OperationRouteDiagramService) => {
            expect(service).toBeTruthy();
        },
    ));
});
