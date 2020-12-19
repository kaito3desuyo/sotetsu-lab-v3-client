/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { TimetableAddService } from './timetable-add.service';

describe('Service: TimetableAdd', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TimetableAddService],
        });
    });

    it('should ...', inject(
        [TimetableAddService],
        (service: TimetableAddService) => {
            expect(service).toBeTruthy();
        }
    ));
});
