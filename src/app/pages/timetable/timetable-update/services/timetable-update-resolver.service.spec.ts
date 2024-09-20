import { TestBed } from '@angular/core/testing';

import { TimetableUpdateResolverService } from './timetable-update-resolver.service';

describe('TimetableUpdateResolverService', () => {
    let service: TimetableUpdateResolverService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(TimetableUpdateResolverService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
