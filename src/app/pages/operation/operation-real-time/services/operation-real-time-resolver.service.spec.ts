/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { OperationRealTimeResolverService } from './operation-real-time-resolver.service';

describe('Service: OperationRealTimeResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [OperationRealTimeResolverService],
        });
    });

    it('should ...', inject(
        [OperationRealTimeResolverService],
        (service: OperationRealTimeResolverService) => {
            expect(service).toBeTruthy();
        },
    ));
});
