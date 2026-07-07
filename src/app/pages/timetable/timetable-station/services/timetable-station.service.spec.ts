/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { provideHttpClient } from '@angular/common/http';
import { TestBed, inject } from '@angular/core/testing';
import { TimetableStationService } from './timetable-station.service';

describe('Service: TimetableStation', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), TimetableStationService],
        });
    });

    it('should ...', inject(
        [TimetableStationService],
        (service: TimetableStationService) => {
            expect(service).toBeTruthy();
        },
    ));
});
