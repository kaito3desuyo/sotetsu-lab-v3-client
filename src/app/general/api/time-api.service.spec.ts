/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { TimeApiService } from './time-api.service';

describe('Service: TimeApi', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TimeApiService],
        });
    });

    it('should ...', inject([TimeApiService], (service: TimeApiService) => {
        expect(service).toBeTruthy();
    }));
});
