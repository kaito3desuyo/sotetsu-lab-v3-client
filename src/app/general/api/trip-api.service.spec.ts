/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { TripApiService } from './trip-api.service';

describe('Service: TripApi', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TripApiService]
        });
    });

    it('should ...', inject([TripApiService], (service: TripApiService) => {
        expect(service).toBeTruthy();
    }));
});
