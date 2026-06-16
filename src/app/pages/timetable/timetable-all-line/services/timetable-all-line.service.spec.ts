import { TestBed, inject } from '@angular/core/testing';

import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import {
    TimetableAllLineStateQuery,
    TimetableAllLineStateStore,
} from '../states/timetable-all-line.state';
import { TimetableAllLineService } from './timetable-all-line.service';

describe('Service: TimetableAllLine', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TimetableAllLineService,
                { provide: ServiceService, useValue: {} },
                { provide: TripBlockService, useValue: {} },
                { provide: ServiceListStateQuery, useValue: {} },
                { provide: TimetableAllLineStateStore, useValue: {} },
                { provide: TimetableAllLineStateQuery, useValue: {} },
            ],
        });
    });

    it('should ...', inject(
        [TimetableAllLineService],
        (service: TimetableAllLineService) => {
            expect(service).toBeTruthy();
        },
    ));
});
