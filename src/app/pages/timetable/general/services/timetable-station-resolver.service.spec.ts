/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { TimetableStationResolverService } from './timetable-station-resolver.service';

describe('Service: TimetableStationResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TimetableStationResolverService],
        });
    });

    it('should ...', inject(
        [TimetableStationResolverService],
        (service: TimetableStationResolverService) => {
            expect(service).toBeTruthy();
        }
    ));
});
