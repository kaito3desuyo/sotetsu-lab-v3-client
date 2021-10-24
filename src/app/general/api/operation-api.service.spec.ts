/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { OperationApiService } from './operation-api.service';

describe('Service: OperationApi', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [OperationApiService],
        });
    });

    it('should ...', inject(
        [OperationApiService],
        (service: OperationApiService) => {
            expect(service).toBeTruthy();
        }
    ));
});
