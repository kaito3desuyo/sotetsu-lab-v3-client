/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { TimetableSearchFormResolverService } from './timetable-search-form-resolver.service';

describe('Service: TimetableSearchFormResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TimetableSearchFormResolverService],
        });
    });

    it('should ...', inject(
        [TimetableSearchFormResolverService],
        (service: TimetableSearchFormResolverService) => {
            expect(service).toBeTruthy();
        }
    ));
});
