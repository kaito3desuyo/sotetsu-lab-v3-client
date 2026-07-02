import { TestBed, inject } from '@angular/core/testing';

import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import {
    OperationTableStateQuery,
    OperationTableStateStore,
} from '../states/operation-table.state';
import { OperationTableService } from './operation-table.service';

describe('Service: OperationTable', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                OperationTableService,
                { provide: OperationService, useValue: {} },
                { provide: StationService, useValue: {} },
                { provide: TripClassService, useValue: {} },
                { provide: OperationTableStateStore, useValue: {} },
                { provide: OperationTableStateQuery, useValue: {} },
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
