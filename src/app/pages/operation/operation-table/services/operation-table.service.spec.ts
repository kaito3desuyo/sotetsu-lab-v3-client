import { TestBed, inject } from '@angular/core/testing';
import { lastValueFrom, of } from 'rxjs';

import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { OperationTableStore } from '../stores/operation-table.store';
import { OperationTableService } from './operation-table.service';

describe('Service: OperationTable', () => {
    const operationService = {
        findManyWithTrips: jest.fn(),
        findOneWithTrips: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        TestBed.configureTestingModule({
            providers: [
                OperationTableService,
                { provide: CalendarService, useValue: {} },
                { provide: OperationService, useValue: operationService },
                { provide: StationService, useValue: {} },
                { provide: TripClassService, useValue: {} },
            ],
        });
    });

    afterEach(() => {
        OperationTableStore.setCalendarId(null);
        OperationTableStore.setOperationTrips([]);
    });

    it('should ...', inject(
        [OperationTableService],
        (service: OperationTableService) => {
            expect(service).toBeTruthy();
        },
    ));

    it('ダイヤ内の全運用を 1 回で取り、休車（運用番号 100）を除いてストアへ入れる', inject(
        [OperationTableService],
        async (service: OperationTableService) => {
            const operationTrips = ['11', '100', '91G'].map(
                (operationNumber) =>
                    ({
                        operation: { operationNumber },
                        trips: [],
                    }) as unknown as OperationTripsDto,
            );
            operationService.findManyWithTrips.mockReturnValue(
                of(operationTrips),
            );
            OperationTableStore.setCalendarId('cal-1');

            await lastValueFrom(service.fetchOperationTrips());

            expect(operationService.findManyWithTrips).toHaveBeenCalledWith({
                calendarId: 'cal-1',
            });
            // 運用ごとの取得（旧方式の N+1）はしない
            expect(operationService.findOneWithTrips).not.toHaveBeenCalled();
            expect(
                OperationTableStore.operations.map(
                    ({ operation }) => operation.operationNumber,
                ),
            ).toEqual(['11', '91G']);
        },
    ));

    it('ダイヤ未選択では取りにいかない', inject(
        [OperationTableService],
        async (service: OperationTableService) => {
            OperationTableStore.setCalendarId(null);

            await lastValueFrom(service.fetchOperationTrips(), {
                defaultValue: undefined,
            });

            expect(operationService.findManyWithTrips).not.toHaveBeenCalled();
        },
    ));
});
