/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject } from '@angular/core/testing';
import { TrainLocationResolverService } from './train-location-resolver.service';

describe('Service: TrainLocationResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TrainLocationResolverService],
        });
    });

    it('should ...', inject(
        [TrainLocationResolverService],
        (service: TrainLocationResolverService) => {
            expect(service).toBeTruthy();
        },
    ));
});
