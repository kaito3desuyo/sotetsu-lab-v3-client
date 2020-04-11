/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
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
