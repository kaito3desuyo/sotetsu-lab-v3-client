import { TestBed, inject } from '@angular/core/testing';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { OperationPastTimeService } from './operation-past-time.service';

describe('Service: OperationPastTime', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                OperationPastTimeService,
                { provide: AgencyListStateQuery, useValue: { agencies: [] } },
                { provide: CalendarService, useValue: {} },
                { provide: FormationService, useValue: {} },
                { provide: OperationSightingService, useValue: {} },
                { provide: OperationService, useValue: {} },
            ],
        });
    });

    it('should ...', inject(
        [OperationPastTimeService],
        (service: OperationPastTimeService) => {
            expect(service).toBeTruthy();
        },
    ));
});
