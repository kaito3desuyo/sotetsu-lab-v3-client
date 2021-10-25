/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { TimetableUpdateResolverService } from './timetable-update-resolver.service';

describe('Service: TimetableUpdateResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TimetableUpdateResolverService],
        });
    });

    it('should ...', inject(
        [TimetableUpdateResolverService],
        (service: TimetableUpdateResolverService) => {
            expect(service).toBeTruthy();
        }
    ));
});
