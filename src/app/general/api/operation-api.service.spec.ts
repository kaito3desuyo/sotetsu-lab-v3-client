/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
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
