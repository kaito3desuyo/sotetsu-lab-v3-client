/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { AgencyApiService } from './agency-api.service';

describe('Service: AgencyApi', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [AgencyApiService],
        });
    });

    it('should ...', inject([AgencyApiService], (service: AgencyApiService) => {
        expect(service).toBeTruthy();
    }));
});
