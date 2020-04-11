/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { VehicleApiService } from './vehicle-api.service';

describe('Service: VehicleApi', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [VehicleApiService],
        });
    });

    it('should ...', inject(
        [VehicleApiService],
        (service: VehicleApiService) => {
            expect(service).toBeTruthy();
        }
    ));
});
