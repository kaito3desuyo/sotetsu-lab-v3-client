/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
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
        }
    ));
});
