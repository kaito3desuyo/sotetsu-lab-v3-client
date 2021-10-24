/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('Service: Loading', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [LoadingService],
        });
    });

    it('should ...', inject([LoadingService], (service: LoadingService) => {
        expect(service).toBeTruthy();
    }));
});
