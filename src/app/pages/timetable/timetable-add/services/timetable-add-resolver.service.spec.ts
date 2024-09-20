/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { TimetableAddResolverService } from './timetable-add-resolver.service';

describe('Service: TimetableAddResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TimetableAddResolverService],
        });
    });

    it('should ...', inject(
        [TimetableAddResolverService],
        (service: TimetableAddResolverService) => {
            expect(service).toBeTruthy();
        },
    ));
});
