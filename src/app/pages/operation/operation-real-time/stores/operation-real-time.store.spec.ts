import { TestBed } from '@angular/core/testing';
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import {
    OperationRealTimeSnapshot,
    OperationRealTimeStore,
} from './operation-real-time.store';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('OperationRealTimeStore の保存', () => {
    const getItem = jest.fn();
    const setItem = jest.fn();

    beforeEach(() => {
        getItem.mockReset();
        setItem.mockReset();
        setItem.mockResolvedValue(undefined);
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: DeviceStorage,
                    useValue: { getItem, setItem, removeItem: jest.fn() },
                },
            ],
        });
    });

    it('旧い丸ごと保存の値を読んだ後、保存先には設定の 6 項目だけが残る', async () => {
        getItem.mockResolvedValue({
            routes: [{ routeId: 'old-route' }],
            currentPositions: { '5': { prev: null } },
            operationGroups: [],
            loadingQueue: [true],
            selectedAgencyIds: ['sotetsu'],
        });

        const store = TestBed.inject(OperationRealTimeStore);
        await flush();

        expect(getItem).toHaveBeenCalledWith('OperationRealTimeStore');
        expect(setItem).toHaveBeenCalledTimes(1);
        expect(setItem).toHaveBeenCalledWith({
            key: 'OperationRealTimeStore',
            value: {
                selectedAgencyIds: ['sotetsu'],
                selectedGroupNames: [],
                controlCollapsed: false,
                isEnableAutoReload: true,
                isVisibleSightingHistories: true,
                isVisibleCurrentPosition: true,
            },
        });
        // 設定以外は古い値を戻さない
        expect(store.routes()).toEqual([]);
        expect(store.currentPositions()).toEqual({});
        expect(store.isLoading()).toBe(false);
        expect(store.selectedAgencyIds()).toEqual(['sotetsu']);
        expect(store.settingsReady()).toBe(true);
    });

    it('設定を変えたら、1 秒おいて 6 項目だけを保存する', async () => {
        jest.useFakeTimers();
        try {
            getItem.mockResolvedValue(null);
            const store = TestBed.inject(OperationRealTimeStore);
            await jest.advanceTimersByTimeAsync(0);

            store.setIsEnableAutoReload(false);
            store.setRoutes([{ routeId: 'r' }] as never);
            await jest.advanceTimersByTimeAsync(999);
            expect(setItem).not.toHaveBeenCalled();

            await jest.advanceTimersByTimeAsync(1);
            expect(setItem).toHaveBeenCalledTimes(1);
            expect(setItem).toHaveBeenCalledWith({
                key: 'OperationRealTimeStore',
                value: {
                    selectedAgencyIds: [],
                    selectedGroupNames: [],
                    controlCollapsed: false,
                    isEnableAutoReload: false,
                    isVisibleSightingHistories: true,
                    isVisibleCurrentPosition: true,
                },
            });
        } finally {
            jest.useRealTimers();
        }
    });

    it('操作帯を畳んだ状態は設定として保存する', async () => {
        jest.useFakeTimers();
        try {
            getItem.mockResolvedValue({ controlCollapsed: true });
            const store = TestBed.inject(OperationRealTimeStore);
            await jest.advanceTimersByTimeAsync(0);
            expect(store.controlCollapsed()).toBe(true);

            store.setControlCollapsed(false);
            await jest.advanceTimersByTimeAsync(1000);
            expect(setItem).toHaveBeenLastCalledWith({
                key: 'OperationRealTimeStore',
                value: expect.objectContaining({ controlCollapsed: false }),
            });
        } finally {
            jest.useRealTimers();
        }
    });
});

describe('OperationRealTimeStore', () => {
    const save = jest.fn();
    const restore = jest.fn();

    beforeEach(() => {
        save.mockReset().mockResolvedValue(undefined);
        restore.mockReset();
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: DeviceStorage,
                    useValue: {
                        getItem: () => Promise.resolve(null),
                        setItem: () => Promise.resolve(),
                        removeItem: () => Promise.resolve(),
                    },
                },
                { provide: OfflineSnapshots, useValue: { save, restore } },
            ],
        });
    });

    const operation = (operationNumber: string) =>
        ({ operationId: `op-${operationNumber}`, operationNumber }) as never;
    const formation = (formationNumber: string, agencyId: string) =>
        ({
            formationId: `f-${formationNumber}`,
            formationNumber,
            agencyId,
        }) as never;
    const numbersOf = (list: { operationNumber?: string }[]) =>
        list.map((o) => o.operationNumber);

    it('sortedOperations は 100 を除いて運用番号の順に並べ、取得した順（operations）は変えない', () => {
        const store = TestBed.inject(OperationRealTimeStore);
        store.setOperations(['21', '100', '11', '31'].map(operation));

        expect(numbersOf(store.sortedOperations())).toEqual(['11', '21', '31']);
        expect(numbersOf(store.operations())).toEqual([
            '21',
            '100',
            '11',
            '31',
        ]);
    });

    it('sortedFormations は会社の順（agencyOrder）、会社内は編成番号の順で、取得した順（formations）は変えない', () => {
        const store = TestBed.inject(OperationRealTimeStore);
        store.setAgencyOrder(['sotetsu', 'tokyu']);
        store.setFormations([
            formation('5101', 'tokyu'),
            formation('10702', 'sotetsu'),
            formation('9000', 'other'),
            formation('10701', 'sotetsu'),
        ]);

        expect(store.sortedFormations().map((f) => f.formationNumber)).toEqual([
            '10701',
            '10702',
            '5101',
            '9000',
        ]);
        expect(store.formations().map((f) => f.formationNumber)).toEqual([
            '5101',
            '10702',
            '9000',
            '10701',
        ]);
    });

    it('normalizedSelectedGroupNames は旧い群名を今の名前にそろえる', () => {
        const store = TestBed.inject(OperationRealTimeStore);
        store.setSelectedGroupNames(['3G群', '1群']);

        expect(store.normalizedSelectedGroupNames()).toEqual([
            'G群（目黒線）',
            '1群',
        ]);
        expect(store.selectedGroupNames()).toEqual(['3G群', '1群']);
    });

    it('読み込み中は enable / disable / reset で変わり、起動時は空', () => {
        const store = TestBed.inject(OperationRealTimeStore);
        expect(store.isLoading()).toBe(false);

        store.enableLoading();
        store.enableLoading();
        store.disableLoading();
        expect(store.isLoading()).toBe(true);

        store.resetLoading();
        expect(store.isLoading()).toBe(false);
    });

    it('firstLoading は最初 true で、setFirstLoading で変わる', () => {
        const store = TestBed.inject(OperationRealTimeStore);
        expect(store.firstLoading()).toBe(true);

        store.setFirstLoading(false);

        expect(store.firstLoading()).toBe(false);
    });

    it('運用・編成をセットしたら取得済みになり、resetHasFetched で外れる', () => {
        const store = TestBed.inject(OperationRealTimeStore);
        expect(store.hasFetchedOperations()).toBe(false);
        expect(store.hasFetchedFormations()).toBe(false);

        store.setOperations([]);
        store.setFormations([]);
        expect(store.hasFetchedOperations()).toBe(true);
        expect(store.hasFetchedFormations()).toBe(true);

        store.resetHasFetched();
        expect(store.hasFetchedOperations()).toBe(false);
        expect(store.hasFetchedFormations()).toBe(false);
    });

    it('currentPositionsThatShouldUpdate は呼ぶたびに今の時刻で判定する', () => {
        jest.useFakeTimers();
        try {
            jest.setSystemTime(new Date('2026-10-27T10:00:00'));
            const store = TestBed.inject(OperationRealTimeStore);
            // 出庫前（次の始発が 10:30）
            store.setCurrentPosition('11', {
                prev: null,
                current: null,
                next: {
                    startTime: {
                        departureDays: 1,
                        departureTime: '10:30:00',
                    },
                },
                operation: { operationId: 'op-11', operationNumber: '11' },
            } as never);

            expect(store.currentPositionsThatShouldUpdate()).toHaveLength(0);

            jest.setSystemTime(new Date('2026-10-27T10:31:00'));

            expect(store.currentPositionsThatShouldUpdate()).toHaveLength(1);
        } finally {
            jest.useRealTimers();
        }
    });

    it('snapshot の中身を restoreSnapshot で戻し、最終更新に保存した時刻を出す（画面の設定は今のまま）', () => {
        const store = TestBed.inject(OperationRealTimeStore);
        store.setCalendar({ calendarId: 'cal-1' } as never);
        store.setOperations([operation('11')]);
        store.setStations([{ stationId: 'st-1' }] as never);
        store.setCurrentPosition('11', { prev: null } as never);
        const snapshot = store.snapshot();
        store.setCalendar(null as never);
        store.setOperations([]);
        store.setStations([]);
        store.setCurrentPosition('11', null as never);
        store.resetHasFetched();
        store.setSelectedGroupNames(['1群']);

        store.restoreSnapshot(snapshot, 1_700_000_000_000);

        expect(store.snapshot()).toEqual(snapshot);
        expect(store.finalUpdateTime()).toBe(1_700_000_000);
        expect(store.hasFetchedOperations()).toBe(true);
        expect(store.hasFetchedFormations()).toBe(true);
        expect(store.selectedGroupNames()).toEqual(['1群']);
        expect(Object.keys(snapshot).sort()).toEqual(
            [
                'routes',
                'agencyOrder',
                'stations',
                'tripClasses',
                'calendar',
                'operations',
                'itineraryLinks',
                'formations',
                'operationGroups',
                'operationSightingTimeCrossSections',
                'formationSightingTimeCrossSections',
                'operationSightingHistories',
                'formationSightingHistories',
                'currentPositions',
            ].sort(),
        );
    });

    it('圏外用の保存は main のキーで、保存した中身と時刻を戻す', async () => {
        const store = TestBed.inject(OperationRealTimeStore);
        store.setRoutes([{ routeId: 'r-1' }] as never);

        await store.saveOfflineSnapshot('main', {});

        expect(save).toHaveBeenCalledWith({
            key: 'OperationRealTime',
            conditions: {},
            data: store.snapshot(),
        });

        restore.mockImplementation(
            async (params: {
                apply: (
                    data: OperationRealTimeSnapshot,
                    savedAt: number,
                ) => void;
            }) => {
                params.apply({ ...store.snapshot(), routes: [] }, 2_000);
                return { data: {}, savedAt: 2_000 };
            },
        );
        await store.restoreOfflineSnapshot('main', {});

        expect(restore.mock.calls[0][0].key).toBe('OperationRealTime');
        expect(restore.mock.calls[0][0].conditions).toEqual({});
        expect(store.routes()).toEqual([]);
        expect(store.finalUpdateTime()).toBe(2);
    });
});
