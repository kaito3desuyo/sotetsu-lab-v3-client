import { TestBed, inject } from '@angular/core/testing';
import { of } from 'rxjs';
import { TitleService } from 'src/app/core/services/title.service';
import { InitializeStateQuery } from 'src/app/global-states/initialize.state';
import { OperationPastTimeResolverService } from './operation-past-time-resolver.service';

describe('Service: OperationPastTimeResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                OperationPastTimeResolverService,
                { provide: TitleService, useValue: { setTitle: () => {} } },
                {
                    provide: InitializeStateQuery,
                    useValue: { isInitialized$: of(true) },
                },
            ],
        });
    });

    it('should ...', inject(
        [OperationPastTimeResolverService],
        (service: OperationPastTimeResolverService) => {
            expect(service).toBeTruthy();
        },
    ));
});
