/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { OperationPastTimeResolverService } from './operation-past-time-resolver.service';

describe('Service: OperationPastTimeResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [OperationPastTimeResolverService],
        });
    });

    it('should ...', inject(
        [OperationPastTimeResolverService],
        (service: OperationPastTimeResolverService) => {
            expect(service).toBeTruthy();
        },
    ));
});
