import { TestBed } from '@angular/core/testing';

import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import {
    TimetableEditFormStateQuery,
    TimetableEditFormStateStore,
} from '../states/timetable-edit-form.state';
import { TimetableEditFormService } from './timetable-edit-form.service';

describe('TimetableEditFormService', () => {
    let service: TimetableEditFormService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TimetableEditFormService,
                { provide: ServiceService, useValue: {} },
                { provide: OperationService, useValue: {} },
                { provide: TripClassService, useValue: {} },
                { provide: TripBlockService, useValue: {} },
                { provide: ServiceListStateQuery, useValue: {} },
                { provide: TimetableEditFormStateStore, useValue: {} },
                { provide: TimetableEditFormStateQuery, useValue: {} },
            ],
        });
        service = TestBed.inject(TimetableEditFormService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
