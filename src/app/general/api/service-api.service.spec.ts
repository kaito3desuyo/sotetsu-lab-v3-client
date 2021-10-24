/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { ServiceApiService } from './service-api.service';

describe('Service: ServiceApi', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ServiceApiService],
        });
    });

    it('should ...', inject(
        [ServiceApiService],
        (service: ServiceApiService) => {
            expect(service).toBeTruthy();
        }
    ));
});
