/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
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
