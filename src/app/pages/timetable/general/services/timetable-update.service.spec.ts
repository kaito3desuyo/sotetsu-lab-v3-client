/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
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
