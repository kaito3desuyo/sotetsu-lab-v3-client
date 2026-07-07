import { TestBed, inject } from '@angular/core/testing';

import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { OperationTableService } from './operation-table.service';

describe('Service: OperationTable', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                OperationTableService,
                { provide: CalendarService, useValue: {} },
                { provide: OperationService, useValue: {} },
                { provide: StationService, useValue: {} },
                { provide: TripClassService, useValue: {} },
            ],
        });
    });

    it('should ...', inject(
        [OperationTableService],
        (service: OperationTableService) => {
            expect(service).toBeTruthy();
        },
    ));
});
