/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { TimetableAllLineService } from './timetable-all-line.service';

describe('Service: TimetableAllLine', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TimetableAllLineService],
        });
    });

    it('should ...', inject(
        [TimetableAllLineService],
        (service: TimetableAllLineService) => {
            expect(service).toBeTruthy();
        }
    ));
});
