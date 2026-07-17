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

    it('1運用分のクロスセクション取得が失敗しても残りは継続して store に反映される', async () => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                TimetableStationService,
                {
                    provide: OperationSightingService,
                    useValue: {
                        findOneTimeCrossSectionByOperationNumber: ({
                            operationNumber,
                        }: {
                            operationNumber: string;
                        }) =>
                            operationNumber === '51'
                                ? throwError(() => new Error('boom'))
                                : of(crossSection),
                    },
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

        // reject せず解決すること（=フェッチ全滅・ローディング残留の回帰防止）
        await lastValueFrom(
            service.fetchOperationSightingTimeCrossSections(),
        );

        const record =
            TimetableStationStore.operationSightingTimeCrossSections;
        expect(record['52']).toBeDefined();
        expect(record['51']).toBeUndefined();
    });

    it('tripBlocks バルク取得が失敗しても reject せず空配列で継続する', async () => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                TimetableStationService,
                {
                    provide: TripBlockService,
                    useValue: {
                        findManyByFilter: () =>
                            throwError(() => new Error('boom')),
                    },
                },
            ],
        });
        const service = TestBed.inject(TimetableStationService);

        TimetableStationStore.setCalendarId('cal-1');
        TimetableStationStore.setTripDirection(ETripDirection.INBOUND);

        await lastValueFrom(service.fetchTripBlocks());

        expect(TimetableStationStore.tripBlocks).toEqual([]);
    });
});
