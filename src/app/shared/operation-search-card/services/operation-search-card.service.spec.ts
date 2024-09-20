import { TestBed } from '@angular/core/testing';

import { OperationSearchCardService } from './operation-search-card.service';

describe('OperationSearchCardService', () => {
    let service: OperationSearchCardService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(OperationSearchCardService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
