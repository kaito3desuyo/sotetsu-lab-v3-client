import { TestBed, inject } from '@angular/core/testing';

import { TitleService } from 'src/app/core/services/title.service';
import { InitializeStateQuery } from 'src/app/global-states/initialize.state';
import { of } from 'rxjs';
import { OperationTableResolverService } from './operation-table-resolver.service';

describe('Service: OperationTableResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                OperationTableResolverService,
                { provide: TitleService, useValue: { setTitle: () => {} } },
                {
                    provide: InitializeStateQuery,
                    useValue: { isInitialized$: of(true) },
                },
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
