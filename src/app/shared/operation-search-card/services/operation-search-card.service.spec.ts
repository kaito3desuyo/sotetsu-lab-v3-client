import { TestBed } from '@angular/core/testing';

import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import {
    OperationSearchCardStateQuery,
    OperationSearchCardStateStore,
} from '../states/operation-search-card.state';
import { OperationSearchCardService } from './operation-search-card.service';

describe('OperationSearchCardService', () => {
    let service: OperationSearchCardService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                OperationSearchCardService,
                { provide: OperationService, useValue: {} },
                { provide: OperationSearchCardStateStore, useValue: {} },
                { provide: OperationSearchCardStateQuery, useValue: {} },
            ],
        });
        service = TestBed.inject(OperationSearchCardService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
