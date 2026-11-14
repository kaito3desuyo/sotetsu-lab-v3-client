import { TestBed, inject } from '@angular/core/testing';
import { lastValueFrom, of, throwError } from 'rxjs';
import { DeviceStorage } from 'src/app/core/storage/device-storage';

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

    const calendarService = { findOne: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        TestBed.configureTestingModule({
            providers: [
                OperationTableService,
                {
                    provide: DeviceStorage,
                    useValue: {
                        getItem: () => Promise.resolve(null),
                        setItem: () => Promise.resolve(),
                        removeItem: () => Promise.resolve(),
                    },
                },
                { provide: CalendarService, useValue: calendarService },
                { provide: OperationService, useValue: operationService },
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
            TestBed.inject(OperationTableStore).setCalendarId('cal-1');

            await lastValueFrom(service.fetchOperationTrips());

            expect(operationService.findManyWithTrips).toHaveBeenCalledWith({
                calendarId: 'cal-1',
            });
            // 運用ごとの取得（旧方式の N+1）はしない
            expect(operationService.findOneWithTrips).not.toHaveBeenCalled();
            expect(
                TestBed.inject(OperationTableStore)
                    .operationTrips()
                    .map(({ operation }) => operation.operationNumber),
            ).toEqual(['11', '91G']);
        },
    ));

    it('ダイヤ未選択では取りにいかない', inject(
        [OperationTableService],
        async (service: OperationTableService) => {
            TestBed.inject(OperationTableStore).setCalendarId(null);

            await lastValueFrom(service.fetchOperationTrips(), {
                defaultValue: undefined,
            });

            expect(operationService.findManyWithTrips).not.toHaveBeenCalled();
        },
    ));

    // api は無い ID に 404 でなく 200 と空の本文（null）を返す
    it('ダイヤ: 取れたら true、api が null を返したら false（ストアは null にする）', inject(
        [OperationTableService],
        async (service: OperationTableService) => {
            TestBed.inject(OperationTableStore).setCalendarId('cal-1');

            calendarService.findOne.mockReturnValue(
                of({ calendarId: 'cal-1' }),
            );
            expect(await lastValueFrom(service.fetchCalendar())).toBe(true);

            calendarService.findOne.mockReturnValue(of(null));
            expect(await lastValueFrom(service.fetchCalendar())).toBe(false);
            expect(TestBed.inject(OperationTableStore).calendar()).toBeNull();
        },
    ));

    it('ダイヤ: 失敗（5xx・通信の失敗）はエラーのまま流す', inject(
        [OperationTableService],
        async (service: OperationTableService) => {
            TestBed.inject(OperationTableStore).setCalendarId('cal-1');
            calendarService.findOne.mockReturnValue(
                throwError(() => new Error('500')),
            );

            await expect(
                lastValueFrom(service.fetchCalendar()),
            ).rejects.toThrow('500');
        },
    ));
});
