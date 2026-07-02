import { TestBed } from '@angular/core/testing';

import {
    TimetableAllLineStateQuery,
    TimetableAllLineStateStore,
} from '../states/timetable-all-line.state';
import { TimetableAllLineService } from './timetable-all-line.service';
import { TimetableAllLineResolverService } from './timetable-all-line-resolver.service';

describe('TimetableAllLineResolverService', () => {
    let service: TimetableAllLineResolverService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TimetableAllLineResolverService,
                { provide: TimetableAllLineService, useValue: {} },
                { provide: TimetableAllLineStateStore, useValue: {} },
                { provide: TimetableAllLineStateQuery, useValue: {} },
            ],
        });
        service = TestBed.inject(TimetableAllLineResolverService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
