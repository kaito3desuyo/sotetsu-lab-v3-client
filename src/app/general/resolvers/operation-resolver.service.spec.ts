/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { OperationResolverService } from './operation-resolver.service';

describe('Service: OperationResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [OperationResolverService],
        });
    });

    it('should ...', inject(
        [OperationResolverService],
        (service: OperationResolverService) => {
            expect(service).toBeTruthy();
        }
    ));
});
