import { TestBed } from '@angular/core/testing';

import { EMPTY } from 'rxjs';
import { InitializeStateQuery } from 'src/app/global-states/initialize.state';
import { TimetableAllLineResolverService } from './timetable-all-line-resolver.service';

describe('TimetableAllLineResolverService', () => {
    let service: TimetableAllLineResolverService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TimetableAllLineResolverService,
                {
                    provide: InitializeStateQuery,
                    useValue: { isInitialized$: EMPTY },
                },
            ],
        });
        service = TestBed.inject(TimetableAllLineResolverService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
