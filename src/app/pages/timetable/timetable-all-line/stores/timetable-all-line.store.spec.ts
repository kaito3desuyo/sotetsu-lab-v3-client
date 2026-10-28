import { PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { TimetableAllLineUtil } from '../utils/timetable-all-line.util';
import { TimetableAllLineStore } from './timetable-all-line.store';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const route = (routeId: string) => ({
    routeStationListId: routeId,
    route: { routeId, routeName: routeId },
});
const station = (stationId: string, routeId: string): never =>
    ({
        stationId,
        stationName: stationId,
        routeStationLists: [route(routeId)],
    }) as never;

/** 1 つの駅に 1 本だけ停まる列車ブロック。tripId は `<ブロック ID>-trip` */
const block = (tripBlockId: string, time: string): never =>
    ({
        tripBlockId,
        trips: [
            {
                tripId: `${tripBlockId}-trip`,
                tripBlockId,
                times: [
                    {
                        timeId: tripBlockId,
                        stationId: 'st-1',
                        arrivalTime: time,
                        departureTime: time,
                        arrivalDays: 0,
                        departureDays: 0,
                    },
                ],
            },
        ],
    }) as never;

describe('TimetableAllLineStore', () => {
    const getItem = jest.fn();
    const setItem = jest.fn();
    const save = jest.fn();
    const restore = jest.fn();

    beforeEach(() => {
        getItem.mockReset();
        setItem.mockReset();
        setItem.mockResolvedValue(undefined);
        save.mockReset();
        save.mockResolvedValue(undefined);
        restore.mockReset();
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: DeviceStorage,
                    useValue: { getItem, setItem, removeItem: jest.fn() },
                },
                { provide: OfflineSnapshots, useValue: { save, restore } },
            ],
        });
    });

    it('取得の世代番号は、新しい番号だけが最新になる', () => {
        const store = TestBed.inject(TimetableAllLineStore);
        const first = store.nextFetchSeq();
        const second = store.nextFetchSeq();

        expect(second).toBe(first + 1);
        expect(store.isLatestFetch(first)).toBe(false);
        expect(store.isLatestFetch(second)).toBe(true);
    });

    it('読み込み中は積んだ数で決まり、作った時点でリセットされている', () => {
        const store = TestBed.inject(TimetableAllLineStore);
        expect(store.isLoading()).toBe(false);

        store.enableLoading();
        store.enableLoading();
        store.disableLoading();
        expect(store.isLoading()).toBe(true);

        store.resetLoading();
        expect(store.isLoading()).toBe(false);
    });

    it('trip_block_id が変わったときだけ、ページ送りを 0 に戻す', () => {
        const store = TestBed.inject(TimetableAllLineStore);
        store.setTripBlockId('tb-1');
        store.setPageSettings({ pageIndex: 3, pageSize: 10, length: 50 });

        store.setTripBlockId('tb-1');
        expect(store.pageSettings().pageIndex).toBe(3);

        store.setTripBlockId('tb-2');
        expect(store.pageSettings().pageIndex).toBe(0);
    });

    it('路線の選択を変えると 1 ページ目に戻り、駅は選んだ路線に絞られる', () => {
        const store = TestBed.inject(TimetableAllLineStore);
        store.setStations([station('st-1', 'r1'), station('st-2', 'r2')]);
        store.setPageSettings({ pageIndex: 2, pageSize: 10, length: 50 });

        store.setSelectedRouteIds(['r2']);

        expect(store.pageSettings().pageIndex).toBe(0);
        expect(store.stations().length).toBe(2);
        expect(store.visibleStations().map((s) => s.stationId)).toEqual([
            'st-2',
        ]);
    });

    it('下り（0）は駅を逆順に並べ、上りはそのまま', () => {
        const store = TestBed.inject(TimetableAllLineStore);
        store.setStations([station('st-1', 'r1'), station('st-2', 'r1')]);

        store.setTripDirection(1);
        expect(store.visibleStations().map((s) => s.stationId)).toEqual([
            'st-1',
            'st-2',
        ]);

        store.setTripDirection(0);
        expect(store.visibleStations().map((s) => s.stationId)).toEqual([
            'st-2',
            'st-1',
        ]);
    });

    it('ダイヤがあってまだ取り終えていないときだけ、骨組みを待つ', () => {
        const store = TestBed.inject(TimetableAllLineStore);
        expect(store.isAwaitingTripBlocks()).toBe(false);

        store.setCalendarId('cal-1');
        expect(store.isAwaitingTripBlocks()).toBe(true);

        store.setHasFetchedTripBlocks(true);
        expect(store.isAwaitingTripBlocks()).toBe(false);
    });

    it('圏外の保存は、駅・会社・路線の順・列車ブロックだけを同じキーで保存する', async () => {
        const store = TestBed.inject(TimetableAllLineStore);
        const stations = [station('st-1', 'r1')];
        store.setStations(stations);
        store.setAgencies([{ agencyId: 'ag' }] as never);
        store.setRouteOrder(['r1']);
        store.setTripBlocks([{ tripBlockId: 'tb' }] as never);
        store.setCalendarId('cal-1');

        await store.saveOfflineSnapshot('main', {
            calendarId: 'cal-1',
            tripDirection: 0,
        });

        expect(save).toHaveBeenCalledWith({
            key: 'TimetableAllLine',
            conditions: { calendarId: 'cal-1', tripDirection: 0 },
            data: {
                stations,
                agencies: [{ agencyId: 'ag' }],
                routeOrder: ['r1'],
                tripBlocks: [{ tripBlockId: 'tb' }],
            },
        });
    });

    it('圏外の保存を戻すと、中身を入れて路線の選択を中身に合わせる', async () => {
        const store = TestBed.inject(TimetableAllLineStore);
        restore.mockImplementation(
            (params: { apply: (data: unknown, savedAt: number) => void }) => {
                params.apply(
                    {
                        stations: [station('st-9', 'route-9')],
                        agencies: [],
                        routeOrder: [],
                        tripBlocks: [],
                    },
                    0,
                );
                return Promise.resolve(null);
            },
        );

        await store.restoreOfflineSnapshot('main', {
            calendarId: 'cal-1',
            tripDirection: 0,
        });

        expect(restore).toHaveBeenCalledWith({
            key: 'TimetableAllLine',
            conditions: { calendarId: 'cal-1', tripDirection: 0 },
            apply: expect.any(Function),
        });
        expect(store.stations().map((s) => s.stationId)).toEqual(['st-9']);
        expect(store.selectedRouteIds()).toEqual(['route-9']);
    });
    describe('並び順の受け渡し（TransferState）', () => {
        const ORDER_KEY = makeStateKey<unknown>('timetable-all-line-order');
        // 入力順 x, y, z の並べ替え結果は y(9:00), x(10:00), z(11:00)
        const blocks = [
            block('x', '10:00:00'),
            block('y', '09:00:00'),
            block('z', '11:00:00'),
        ];
        const tripIds = (store: {
            trips: () => { tripId: string }[];
        }): string[] => store.trips().map((trip) => trip.tripId);

        const setup = (platform: 'server' | 'browser') => {
            TestBed.configureTestingModule({
                providers: [{ provide: PLATFORM_ID, useValue: platform }],
            });
            const transferState = TestBed.inject(TransferState);
            const store = TestBed.inject(TimetableAllLineStore);
            store.setStations([station('st-1', 'r1')]);
            store.setCalendarId('cal-1');
            store.setTripDirection(1);
            return { store, transferState };
        };

        afterEach(() => jest.restoreAllMocks());

        it('サーバーでは並べた順を TransferState に入れる', () => {
            const { store, transferState } = setup('server');
            store.setTripBlocks(blocks);
            const expected = TimetableAllLineUtil.sortTrips(
                store.stations(),
                blocks,
            ).map((b) => b.tripBlockId);

            expect(tripIds(store)).toEqual(['y-trip', 'x-trip', 'z-trip']);
            expect(transferState.get(ORDER_KEY, null)).toEqual({
                calendarId: 'cal-1',
                tripDirection: 1,
                order: expected,
            });
            expect(expected).toEqual(['y', 'x', 'z']);
        });

        it('サーバーでも列車ブロックが 0 本なら何も入れない', () => {
            const { store, transferState } = setup('server');
            store.setTripBlocks([]);

            expect(store.trips()).toEqual([]);
            expect(transferState.hasKey(ORDER_KEY)).toBe(false);
        });

        it('ブラウザで条件が合えば、並べ替えずに渡された順で並べ、キーを消す', () => {
            const { store, transferState } = setup('browser');
            transferState.set(ORDER_KEY, {
                calendarId: 'cal-1',
                tripDirection: 1,
                order: ['z', 'x', 'y'],
            });
            const sortTrips = jest.spyOn(TimetableAllLineUtil, 'sortTrips');
            store.setTripBlocks(blocks);

            expect(tripIds(store)).toEqual(['z-trip', 'x-trip', 'y-trip']);
            expect(sortTrips).not.toHaveBeenCalled();
            expect(transferState.hasKey(ORDER_KEY)).toBe(false);
        });

        it('ブラウザで列車ブロックが 0 本の間は、キーを残して今までどおり', () => {
            const { store, transferState } = setup('browser');
            transferState.set(ORDER_KEY, {
                calendarId: 'cal-1',
                tripDirection: 1,
                order: ['z', 'x', 'y'],
            });
            const sortTrips = jest.spyOn(TimetableAllLineUtil, 'sortTrips');

            expect(store.trips()).toEqual([]);
            expect(transferState.hasKey(ORDER_KEY)).toBe(true);

            sortTrips.mockClear(); // 0 本のときの呼び出しは数えない
            store.setTripBlocks(blocks);
            expect(tripIds(store)).toEqual(['z-trip', 'x-trip', 'y-trip']);
            expect(sortTrips).not.toHaveBeenCalled();
        });

        it.each([
            [
                'calendarId が違う',
                {
                    calendarId: 'cal-2',
                    tripDirection: 1,
                    order: ['z', 'x', 'y'],
                },
            ],
            [
                'tripDirection が違う',
                {
                    calendarId: 'cal-1',
                    tripDirection: 0,
                    order: ['z', 'x', 'y'],
                },
            ],
            [
                'ID が足りない',
                { calendarId: 'cal-1', tripDirection: 1, order: ['z', 'x'] },
            ],
            [
                '知らない ID がある',
                {
                    calendarId: 'cal-1',
                    tripDirection: 1,
                    order: ['z', 'x', 'q'],
                },
            ],
            [
                'ID が重複している',
                {
                    calendarId: 'cal-1',
                    tripDirection: 1,
                    order: ['z', 'x', 'x'],
                },
            ],
        ])(
            'ブラウザで中身が合わない（%s）ときは並べ替え、キーを消す',
            (_, transferred) => {
                const { store, transferState } = setup('browser');
                transferState.set(ORDER_KEY, transferred);
                const sortTrips = jest.spyOn(TimetableAllLineUtil, 'sortTrips');
                store.setTripBlocks(blocks);

                expect(tripIds(store)).toEqual(['y-trip', 'x-trip', 'z-trip']);
                expect(sortTrips).toHaveBeenCalledTimes(1);
                expect(transferState.hasKey(ORDER_KEY)).toBe(false);
            },
        );

        it('ブラウザで受け渡しを使ったあとに方向を変えると、並べ替える', () => {
            const { store, transferState } = setup('browser');
            transferState.set(ORDER_KEY, {
                calendarId: 'cal-1',
                tripDirection: 1,
                order: ['z', 'x', 'y'],
            });
            const sortTrips = jest.spyOn(TimetableAllLineUtil, 'sortTrips');
            store.setTripBlocks(blocks);
            expect(tripIds(store)).toEqual(['z-trip', 'x-trip', 'y-trip']);
            expect(sortTrips).not.toHaveBeenCalled();

            store.setTripDirection(0);

            expect(tripIds(store)).toEqual(['y-trip', 'x-trip', 'z-trip']);
            expect(sortTrips).toHaveBeenCalledTimes(1);
        });
    });
});
