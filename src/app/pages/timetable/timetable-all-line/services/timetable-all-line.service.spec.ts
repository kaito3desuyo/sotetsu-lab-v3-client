import { PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { TestBed, inject } from '@angular/core/testing';
import { Subject, firstValueFrom, lastValueFrom, of } from 'rxjs';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { SKIP_TRANSFER_CACHE } from 'src/app/core/ssr/skip-transfer-cache';
import { ServiceListState } from 'src/app/global-states/service-list.state';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripBlockWithTripsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TimetableAllLineStore } from '../stores/timetable-all-line.store';
import { TimetableAllLineService } from './timetable-all-line.service';

describe('Service: TimetableAllLine', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TimetableAllLineService,
                { provide: ServiceService, useValue: {} },
                { provide: TripBlockService, useValue: {} },
                { provide: ServiceListState, useValue: {} },
            ],
        });
    });

    it('should be created', inject(
        [TimetableAllLineService],
        (service: TimetableAllLineService) => {
            expect(service).toBeTruthy();
        },
    ));
});

describe('Service: TimetableAllLine の fetchTripBlocks', () => {
    const tripBlockService = { findOneById: jest.fn() };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TimetableAllLineService,
                { provide: ServiceService, useValue: {} },
                { provide: TripBlockService, useValue: tripBlockService },
                { provide: ServiceListState, useValue: {} },
            ],
        });
    });

    it('trip_block_id の運行が無い（api が null を返す）ときは、空の配列を入れる', async () => {
        const store = TestBed.inject(TimetableAllLineStore);
        store.setTripBlockId('00000000-0000-4000-8000-0000000000b1');
        const previous = { tripBlockId: 'old' } as TripBlockWithTripsDto;
        store.setTripBlocks([previous]);
        tripBlockService.findOneById.mockReturnValue(of(null));

        await firstValueFrom(
            TestBed.inject(TimetableAllLineService).fetchTripBlocks(),
        );

        expect(store.tripBlocks()).toEqual([]);
    });
});

describe('Service: TimetableAllLine 1 ページ目だけの受け渡し', () => {
    const KEY = makeStateKey<unknown>('timetable-all-line-trips');
    const ORDER_KEY = makeStateKey<unknown>('timetable-all-line-order');

    /** 1 つの駅に 1 本だけ停まる運行。n 番目は 00:n 分発で、入力順がそのまま並びになる */
    const block = (n: number): TripBlockWithTripsDto =>
        ({
            tripBlockId: `b${n}`,
            trips: [
                {
                    tripId: `b${n}-trip`,
                    tripBlockId: `b${n}`,
                    times: [
                        {
                            timeId: `b${n}`,
                            stationId: 'st-1',
                            stopSequence: 1,
                            arrivalTime: `10:${String(n).padStart(2, '0')}:00`,
                            departureTime: `10:${String(n).padStart(2, '0')}:00`,
                            arrivalDays: 0,
                            departureDays: 0,
                        },
                    ],
                },
            ],
        }) as unknown as TripBlockWithTripsDto;
    const makeBlocks = (count: number) =>
        Array.from({ length: count }, (_, i) => block(i));

    const setup = (params: {
        platform: 'server' | 'browser';
        findManyByFilter?: jest.Mock;
        requestCache?: RequestCache;
        calendarId?: string;
    }) => {
        const findManyByFilter =
            params.findManyByFilter ?? jest.fn(() => of(makeBlocks(25)));
        TestBed.configureTestingModule({
            providers: [
                TimetableAllLineService,
                { provide: PLATFORM_ID, useValue: params.platform },
                { provide: ServiceService, useValue: {} },
                { provide: TripBlockService, useValue: { findManyByFilter } },
                { provide: ServiceListState, useValue: {} },
                {
                    provide: QueryInvalidator,
                    useValue: {
                        invalidated$: new Subject(),
                        requestCache: () => params.requestCache ?? 'default',
                    },
                },
            ],
        });
        const service = TestBed.inject(TimetableAllLineService);
        const store = TestBed.inject(TimetableAllLineStore);
        const transferState = TestBed.inject(TransferState);
        store.setStations([
            {
                stationId: 'st-1',
                stationName: 'st-1',
                routeStationLists: [
                    {
                        routeStationListId: 'r1',
                        route: { routeId: 'r1', routeName: 'r1' },
                    },
                ],
            } as never,
        ]);
        store.setCalendarId(params.calendarId ?? 'cal-1');
        store.setTripDirection(1);
        return { service, store, transferState, findManyByFilter };
    };

    const payload = () => ({
        calendarId: 'cal-1',
        tripDirection: 1,
        pageSize: 10,
        listedCount: 25,
        tripBlocks: makeBlocks(10),
    });

    it('サーバーは全量を取ってストアに入れ、先頭 10 本と全体の本数を鍵に積む（全量の応答は引き継がない）', async () => {
        const { service, store, transferState, findManyByFilter } = setup({
            platform: 'server',
        });

        await lastValueFrom(service.fetchTripBlocks());
        service.publishFirstPage();

        expect(store.tripBlocks()).toHaveLength(25);
        expect(store.isPartial()).toBe(false);
        const calls = findManyByFilter.mock.calls as unknown as [
            { context: { get: (t: unknown) => boolean } },
        ][];
        expect(calls[0][0].context.get(SKIP_TRANSFER_CACHE)).toBe(true);
        const sent = transferState.get(KEY, null) as ReturnType<typeof payload>;
        expect(sent.tripBlocks.map((b) => b.tripBlockId)).toEqual(
            makeBlocks(10).map((b) => b.tripBlockId),
        );
        expect(sent.listedCount).toBe(25);
        expect(sent.pageSize).toBe(10);
        expect(transferState.hasKey(ORDER_KEY)).toBe(true);
    });

    it('運行を 1 本指した表示（trip_block_id）では積まない', async () => {
        const { service, store, transferState } = setup({
            platform: 'server',
        });
        store.setTripBlockId('tb-1');
        store.setTripBlocks(makeBlocks(3));

        service.publishFirstPage();

        expect(transferState.hasKey(KEY)).toBe(false);
    });

    it('ブラウザで条件が合えば HTTP を出さずに削った運行で埋め、鍵を消す', async () => {
        const { service, store, transferState, findManyByFilter } = setup({
            platform: 'browser',
        });
        transferState.set(KEY, payload());

        await lastValueFrom(service.fetchTripBlocks());

        expect(findManyByFilter).not.toHaveBeenCalled();
        expect(store.isPartial()).toBe(true);
        expect(store.trips()).toHaveLength(10);
        expect(store.pagination().length).toBe(25);
        expect(transferState.hasKey(KEY)).toBe(false);
        expect(service.usedTransferredTrips()).toBe(true);
    });

    it('削った運行の間に 2 ページ目にしても列は空で骨組みを待ち、全量が届くと 11〜20 本目が出る', async () => {
        const { service, store, transferState, findManyByFilter } = setup({
            platform: 'browser',
        });
        transferState.set(KEY, payload());
        await lastValueFrom(service.fetchTripBlocks());

        store.setHasFetchedTripBlocks(true);
        store.setPageSettings({ pageIndex: 1, pageSize: 10, length: 25 });
        expect(store.trips()).toEqual([]);
        expect(store.isAwaitingTripBlocks()).toBe(true);

        await lastValueFrom(service.fetchTripBlocks());

        expect(findManyByFilter).toHaveBeenCalledTimes(1);
        expect(store.isPartial()).toBe(false);
        expect(store.isAwaitingTripBlocks()).toBe(false);
        expect(store.trips().map((t) => t.tripId)).toEqual(
            makeBlocks(20)
                .slice(10)
                .map((b) => `${b.tripBlockId}-trip`),
        );
    });

    it('削った運行の間に路線の絞り込みを変えたら、全量が届くまで列を出さない', async () => {
        const { service, store, transferState } = setup({
            platform: 'browser',
        });
        transferState.set(KEY, payload());
        await lastValueFrom(service.fetchTripBlocks());

        store.setSelectedRouteIds(['r1']);

        expect(store.trips()).toEqual([]);
        expect(store.isAwaitingTripBlocks()).toBe(true);

        await lastValueFrom(service.fetchTripBlocks());
        expect(store.trips()).toHaveLength(10);
    });

    it('削った運行を QueryCache に入れない（次の fetchTripBlocks は HTTP を出す）', async () => {
        const { service, findManyByFilter, transferState } = setup({
            platform: 'browser',
        });
        transferState.set(KEY, payload());
        await lastValueFrom(service.fetchTripBlocks());
        expect(findManyByFilter).not.toHaveBeenCalled();

        await lastValueFrom(service.fetchTripBlocks());

        expect(findManyByFilter).toHaveBeenCalledTimes(1);
        expect(service.usedTransferredTrips()).toBe(false);
    });

    it.each([
        ['ダイヤ', { calendarId: 'cal-2' }, undefined],
        ['書き込みの後（reload）', {}, 'reload' as RequestCache],
    ])(
        '%s が合わなければ鍵を消して全量を取る',
        async (_, conditions, requestCache) => {
            const { service, store, transferState, findManyByFilter } = setup({
                platform: 'browser',
                requestCache,
                ...conditions,
            });
            transferState.set(KEY, payload());

            await lastValueFrom(service.fetchTripBlocks());

            expect(findManyByFilter).toHaveBeenCalledTimes(1);
            expect(store.isPartial()).toBe(false);
            expect(store.tripBlocks()).toHaveLength(25);
            expect(transferState.hasKey(KEY)).toBe(false);
            expect(service.usedTransferredTrips()).toBe(false);
        },
    );

    it.each([
        [
            '方向',
            (s: ReturnType<typeof setup>['store']) => s.setTripDirection(0),
        ],
        [
            '2 ページ目',
            (s: ReturnType<typeof setup>['store']) =>
                s.setPageSettings({ pageIndex: 1, pageSize: 10, length: 0 }),
        ],
        [
            'ページの大きさ',
            (s: ReturnType<typeof setup>['store']) =>
                s.setPageSettings({ pageIndex: 0, pageSize: 20, length: 0 }),
        ],
        [
            '路線の絞り込み',
            (s: ReturnType<typeof setup>['store']) =>
                s.setSelectedRouteIds(['r1']),
        ],
    ])('%s が既定と違えば鍵を捨てて全量を取る', async (_, change) => {
        const { service, store, transferState, findManyByFilter } = setup({
            platform: 'browser',
        });
        change(store);
        transferState.set(KEY, payload());

        await lastValueFrom(service.fetchTripBlocks());

        expect(findManyByFilter).toHaveBeenCalledTimes(1);
        expect(store.isPartial()).toBe(false);
        expect(transferState.hasKey(KEY)).toBe(false);
    });

    it('取り直しの間に条件が替わったら、古い条件の中身でストアを上書きしない', async () => {
        const response$ = new Subject<TripBlockWithTripsDto[]>();
        const { service, store } = setup({
            platform: 'browser',
            findManyByFilter: jest.fn(() => response$),
        });

        const done = lastValueFrom(service.fetchTripBlocks());
        store.setTripDirection(0);
        response$.next(makeBlocks(3));
        response$.complete();
        await done;

        expect(store.tripBlocks()).toEqual([]);
    });
});
