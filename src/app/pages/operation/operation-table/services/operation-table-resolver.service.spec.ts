/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { OperationTableResolverService } from './operation-table-resolver.service';

describe('Service: OperationTableResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [OperationTableResolverService],
        });
    });

    it('should ...', inject(
        [OperationTableResolverService],
        (service: OperationTableResolverService) => {
            expect(service).toBeTruthy();
        }
    ));
});
