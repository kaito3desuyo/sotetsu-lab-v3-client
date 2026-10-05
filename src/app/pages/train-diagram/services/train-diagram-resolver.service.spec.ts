/* eslint-disable no-unused-vars */

import { TestBed, inject } from '@angular/core/testing';
import { TrainDiagramResolverService } from './train-diagram-resolver.service';

describe('Service: TrainDiagramResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TrainDiagramResolverService],
        });
    });

    it('should ...', inject(
        [TrainDiagramResolverService],
        (service: TrainDiagramResolverService) => {
            expect(service).toBeTruthy();
        },
    ));
});
