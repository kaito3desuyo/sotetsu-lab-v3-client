/* tslint:disable:no-unused-variable */

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
