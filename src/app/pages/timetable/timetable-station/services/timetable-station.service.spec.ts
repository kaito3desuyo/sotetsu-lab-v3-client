/* eslint-disable no-unused-vars */

import { provideHttpClient, withXhr } from '@angular/common/http';
import { PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { TestBed, inject } from '@angular/core/testing';
import { Subject, lastValueFrom, of, throwError } from 'rxjs';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { SKIP_TRANSFER_CACHE } from 'src/app/core/ssr/skip-transfer-cache';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { TimetableStationStore } from '../stores/timetable-station.store';
import { TimetableStationService } from './timetable-station.service';

describe('Service: TimetableStation', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), TimetableStationService],
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

    let store: InstanceType<typeof TimetableStationStore>;

    const setupWith = (sightingService: unknown) => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                TimetableStationService,
                {
                    provide: OperationSightingService,
                    useValue: sightingService,
                },
            ],
        });
        const service = TestBed.inject(TimetableStationService);
        store = TestBed.inject(TimetableStationStore);

        store.resetOperationSightingTimeCrossSections();
        store.setTrips([tripWithOp('t1', 'op-1'), tripWithOp('t2', 'op-2')]);
        store.setOperations([
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
        const record = store.operationSightingTimeCrossSections();
        expect(record['52']).toBeDefined();
        expect(record['51']).toBeUndefined();
    });

    it('時刻断面の取得が失敗しても reject せず解決する', async () => {
        const service = setupWith({
            findManyTimeCrossSectionsByOperationNumbers: () =>
                throwError(() => new Error('boom')),
        });

        // reject せず解決すること（=フェッチ全滅・ローディング残留の回帰防止）
        const fetched = await lastValueFrom(
            service.fetchOperationSightingTimeCrossSections(),
        );

        expect(fetched).toBe(false);
        expect(store.operationSightingTimeCrossSections()).toEqual({});
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
                provideHttpClient(withXhr()),
                TimetableStationService,
                { provide: TripBlockService, useValue: { findManyByFilter } },
            ],
        });
        const service = TestBed.inject(TimetableStationService);
        const store = TestBed.inject(TimetableStationStore);

        store.setCalendarId('cal-1');
        store.setStationId('st-1');
        store.setTripDirection(ETripDirection.INBOUND);

        await lastValueFrom(service.fetchTrips());

        expect(findManyByFilter).toHaveBeenCalledTimes(1);
        expect(store.tripBlocks()).toBe(tripBlocks);
        expect(store.trips().map((t) => t.tripId)).toEqual(['stop']);
    });
});

describe('Service: TimetableStation 削った運行の受け渡し', () => {
    const KEY = makeStateKey<unknown>('timetable-station-trips');

    const time = (stationId: string, stopSequence: number) => ({
        timeId: `${stationId}`,
        stationId,
        stopSequence,
        pickupType: 0,
        dropoffType: 0,
        departureDays: 1,
        departureTime: `0${stopSequence}:00:00`,
    });
    const makeBlocks = () => [
        {
            tripBlockId: 'b1',
            trips: [
                {
                    tripId: 'stop',
                    tripDirection: 0,
                    times: [
                        time('st-0', 1),
                        time('st-1', 2),
                        time('st-2', 3),
                        time('st-3', 4),
                    ],
                },
            ],
        },
        {
            tripBlockId: 'b2',
            trips: [
                {
                    tripId: 'other',
                    tripDirection: 0,
                    times: [time('st-8', 1), time('st-9', 2)],
                },
            ],
        },
    ];

    const setup = (params: {
        platform: 'server' | 'browser';
        findManyByFilter?: jest.Mock;
        requestCache?: RequestCache;
        conditions?: { calendarId: string; stationId: string };
    }) => {
        const findManyByFilter =
            params.findManyByFilter ?? jest.fn(() => of(makeBlocks()));
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                TimetableStationService,
                { provide: PLATFORM_ID, useValue: params.platform },
                { provide: TripBlockService, useValue: { findManyByFilter } },
                {
                    provide: QueryInvalidator,
                    useValue: {
                        invalidated$: new Subject(),
                        requestCache: () => params.requestCache ?? 'default',
                    },
                },
            ],
        });
        const service = TestBed.inject(TimetableStationService);
        const store = TestBed.inject(TimetableStationStore);
        const transferState = TestBed.inject(TransferState);
        store.setCalendarId(params.conditions?.calendarId ?? 'cal-1');
        store.setStationId(params.conditions?.stationId ?? 'st-1');
        store.setTripDirection(ETripDirection.INBOUND);
        return { service, store, transferState, findManyByFilter };
    };

    const payload = () => ({
        calendarId: 'cal-1',
        tripDirection: 0,
        stationId: 'st-1',
        tripBlocks: [
            {
                tripBlockId: 'b1',
                trips: [
                    {
                        tripId: 'stop',
                        tripDirection: 0,
                        times: [
                            time('st-0', 1),
                            time('st-1', 2),
                            time('st-3', 4),
                        ],
                    },
                ],
            },
        ],
    });

    it('サーバーは全量を取ってストアに入れ、削った運行を鍵に積む（全量の応答は引き継がない）', async () => {
        const { service, store, transferState, findManyByFilter } = setup({
            platform: 'server',
        });

        await lastValueFrom(service.fetchTrips());

        expect(store.tripBlocks()).toHaveLength(2);
        const calls = findManyByFilter.mock.calls as unknown as [
            { context: { get: (t: unknown) => boolean } },
        ][];
        expect(calls[0][0].context.get(SKIP_TRANSFER_CACHE)).toBe(true);
        const sent = transferState.get(KEY, null) as ReturnType<typeof payload>;
        expect(sent.stationId).toBe('st-1');
        expect(sent.tripBlocks.map((b) => b.tripBlockId)).toEqual(['b1']);
        expect(sent.tripBlocks[0].trips[0].times).toHaveLength(3);
    });

    it('ブラウザで条件が合えば HTTP を出さずに削った運行で埋め、鍵を消す', async () => {
        const { service, store, transferState, findManyByFilter } = setup({
            platform: 'browser',
        });
        transferState.set(KEY, payload());

        await lastValueFrom(service.fetchTrips());

        expect(findManyByFilter).not.toHaveBeenCalled();
        expect(store.trips().map((t) => t.tripId)).toEqual(['stop']);
        expect(transferState.hasKey(KEY)).toBe(false);
        expect(service.usedTransferredTrips()).toBe(true);
    });

    it('削った運行で埋めたあとの fetchTrips は通常の取得をし、使った印を戻す', async () => {
        const { service, store, transferState, findManyByFilter } = setup({
            platform: 'browser',
        });
        transferState.set(KEY, payload());
        await lastValueFrom(service.fetchTrips());

        await lastValueFrom(service.fetchTrips());

        expect(findManyByFilter).toHaveBeenCalledTimes(1);
        expect(service.usedTransferredTrips()).toBe(false);
        expect(store.tripBlocks()).toHaveLength(2);
    });

    it.each([
        ['ダイヤ', { calendarId: 'cal-2', stationId: 'st-1' }],
        ['駅', { calendarId: 'cal-1', stationId: 'st-2' }],
    ])('%s が合わなければ鍵を消して通常の取得をする', async (_, conditions) => {
        const { service, store, transferState, findManyByFilter } = setup({
            platform: 'browser',
            conditions,
        });
        transferState.set(KEY, payload());

        await lastValueFrom(service.fetchTrips());

        expect(findManyByFilter).toHaveBeenCalledTimes(1);
        expect(store.tripBlocks()).toHaveLength(2);
        expect(transferState.hasKey(KEY)).toBe(false);
        expect(service.usedTransferredTrips()).toBe(false);
    });

    it('書き込みの後（cache: reload）は鍵を使わずに取り直す', async () => {
        const { service, transferState, findManyByFilter } = setup({
            platform: 'browser',
            requestCache: 'reload',
        });
        transferState.set(KEY, payload());

        await lastValueFrom(service.fetchTrips());

        expect(findManyByFilter).toHaveBeenCalledTimes(1);
        expect(service.usedTransferredTrips()).toBe(false);
    });

    it('取り直しの間に駅が替わったら、古い駅の中身でストアを上書きしない', async () => {
        const response$ = new Subject<ReturnType<typeof makeBlocks>>();
        const { service, store } = setup({
            platform: 'browser',
            findManyByFilter: jest.fn(() => response$),
        });

        const done = lastValueFrom(service.fetchTrips());
        store.setStationId('st-2');
        response$.next(makeBlocks());
        response$.complete();
        await done;

        expect(store.tripBlocks()).toEqual([]);
    });
});
