/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { provideHttpClient } from '@angular/common/http';
import { TestBed, inject } from '@angular/core/testing';
import { lastValueFrom, of, throwError } from 'rxjs';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TimetableStationStore } from '../stores/timetable-station.store';
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

describe('Service: TimetableStation 耐障害性（T6.8 再差し戻し回帰）', () => {
    const tripWithOp = (tripId: string, operationId: string) =>
        ({
            tripId,
            tripNumber: tripId,
            tripDirection: 0,
            tripBlockId: `block-${tripId}`,
            times: [],
            tripOperationLists: [{ operationId }],
        }) as never;

    const crossSection = {
        latestSighting: { sightingTime: new Date().toISOString() },
        expectedSighting: {
            formation: { formationNumber: '10708' },
        },
    } as never;

    const setupWith = (sightingService: unknown) => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                TimetableStationService,
                {
                    provide: OperationSightingService,
                    useValue: sightingService,
                },
            ],
        });
        const service = TestBed.inject(TimetableStationService);

        TimetableStationStore.resetOperationSightingTimeCrossSections();
        TimetableStationStore.setTrips([
            tripWithOp('t1', 'op-1'),
            tripWithOp('t2', 'op-2'),
        ]);
        TimetableStationStore.setOperations([
            { operationId: 'op-1', operationNumber: '51' },
            { operationId: 'op-2', operationNumber: '52' },
        ] as never);
        return service;
    };

    it('時刻断面は全運用を 1 回で取り、運用番号ごとに store へ入れる', async () => {
        const findMany = jest.fn(() => of({ '52': crossSection }));
        const service = setupWith({
            findManyTimeCrossSectionsByOperationNumbers: findMany,
        });

        await lastValueFrom(service.fetchOperationSightingTimeCrossSections());

        expect(findMany).toHaveBeenCalledTimes(1);
        expect(findMany).toHaveBeenCalledWith({
            operationNumbers: ['51', '52'],
        });
        const record = TimetableStationStore.operationSightingTimeCrossSections;
        expect(record['52']).toBeDefined();
        expect(record['51']).toBeUndefined();
    });

    it('時刻断面の取得が失敗しても reject せず解決する', async () => {
        const service = setupWith({
            findManyTimeCrossSectionsByOperationNumbers: () =>
                throwError(() => new Error('boom')),
        });

        // reject せず解決すること（=フェッチ全滅・ローディング残留の回帰防止）
        await lastValueFrom(service.fetchOperationSightingTimeCrossSections());

        expect(
            TimetableStationStore.operationSightingTimeCrossSections,
        ).toEqual({});
    });

    it('fetchTrips は方向ごとの運行を 1 本で取り、脚注用の運行とその駅に停まる列車を両方入れる', async () => {
        const stop = {
            tripId: 'stop',
            tripDirection: 0,
            times: [
                {
                    stationId: 'st-1',
                    pickupType: 0,
                    dropoffType: 0,
                    departureTime: '05:00:00',
                },
            ],
        };
        const pass = {
            tripId: 'pass',
            tripDirection: 0,
            times: [{ stationId: 'st-1', pickupType: 1, dropoffType: 1 }],
        };
        const tripBlocks = [{ tripBlockId: 'b1', trips: [stop, pass] }];
        const findManyByFilter = jest.fn(() => of(tripBlocks));
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                TimetableStationService,
                { provide: TripBlockService, useValue: { findManyByFilter } },
            ],
        });
        const service = TestBed.inject(TimetableStationService);

        TimetableStationStore.setCalendarId('cal-1');
        TimetableStationStore.setStationId('st-1');
        TimetableStationStore.setTripDirection(ETripDirection.INBOUND);

        await lastValueFrom(service.fetchTrips());

        expect(findManyByFilter).toHaveBeenCalledTimes(1);
        expect(TimetableStationStore.tripBlocks).toBe(tripBlocks);
        expect(TimetableStationStore.trips.map((t) => t.tripId)).toEqual([
            'stop',
        ]);
    });
});
