/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { TimetableSearchFormService } from './timetable-search-form.service';

describe('Service: TimetableSearchForm', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TimetableSearchFormService],
        });
    });

    it('should ...', inject(
        [TimetableSearchFormService],
        (service: TimetableSearchFormService) => {
            expect(service).toBeTruthy();
        }
    ));
});
