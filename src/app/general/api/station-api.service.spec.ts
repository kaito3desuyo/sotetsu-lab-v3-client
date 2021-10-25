/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { StationApiService } from './station-api.service';

describe('Service: StationApi', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [StationApiService],
        });
    });

    it('should ...', inject(
        [StationApiService],
        (service: StationApiService) => {
            expect(service).toBeTruthy();
        }
    ));
});
