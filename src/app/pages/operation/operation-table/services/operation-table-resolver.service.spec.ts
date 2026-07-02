import { TestBed, inject } from '@angular/core/testing';

import { OperationTableStateStore } from '../states/operation-table.state';
import { OperationTableService } from './operation-table.service';
import { OperationTableResolverService } from './operation-table-resolver.service';

describe('Service: OperationTableResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                OperationTableResolverService,
                { provide: OperationTableService, useValue: {} },
                { provide: OperationTableStateStore, useValue: {} },
            ],
        });
    });

    it('should ...', inject(
        [OperationTableResolverService],
        (service: OperationTableResolverService) => {
            expect(service).toBeTruthy();
        },
    ));
});
