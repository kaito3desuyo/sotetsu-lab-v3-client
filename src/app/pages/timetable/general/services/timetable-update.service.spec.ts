/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { TimetableUpdateService } from './timetable-update.service';

describe('Service: TimetableUpdate', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TimetableUpdateService],
        });
    });

    it('should ...', inject(
        [TimetableUpdateService],
        (service: TimetableUpdateService) => {
            expect(service).toBeTruthy();
        }
    ));
});
