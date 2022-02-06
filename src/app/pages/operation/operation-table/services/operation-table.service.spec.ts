/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { OperationTableService } from './operation-table.service';

describe('Service: OperationTable', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [OperationTableService],
        });
    });

    it('should ...', inject(
        [OperationTableService],
        (service: OperationTableService) => {
            expect(service).toBeTruthy();
        }
    ));
});
