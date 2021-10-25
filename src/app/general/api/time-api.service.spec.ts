/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
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
