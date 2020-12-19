/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { OperationRealTimeService } from './operation-real-time.service';

describe('Service: OperationRealTime', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [OperationRealTimeService],
        });
    });

    it('should ...', inject(
        [OperationRealTimeService],
        (service: OperationRealTimeService) => {
            expect(service).toBeTruthy();
        }
    ));
});
