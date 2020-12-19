/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { OperationPastTimeService } from './operation-past-time.service';

describe('Service: OperationPastTime', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [OperationPastTimeService],
        });
    });

    it('should ...', inject(
        [OperationPastTimeService],
        (service: OperationPastTimeService) => {
            expect(service).toBeTruthy();
        }
    ));
});
