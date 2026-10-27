import { TestBed } from '@angular/core/testing';
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
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

    it('操作帯の畳み状態だけを、今までと同じキーで保存・復元する', async () => {
        getItem.mockResolvedValue({
            controlCollapsed: true,
            tripBlocks: [{ tripBlockId: 'old' }],
        });

        const store = TestBed.inject(TimetableAllLineStore);
        await flush();

        expect(getItem).toHaveBeenCalledWith('TimetableAllLineStore');
        expect(store.controlCollapsed()).toBe(true);
        // 古い丸ごと保存は、畳み状態だけに書き直す。列車データは戻さない
        expect(setItem).toHaveBeenCalledWith({
            key: 'TimetableAllLineStore',
            value: { controlCollapsed: true },
        });
        expect(store.tripBlocks()).toEqual([]);
        expect(store.settingsReady()).toBe(true);
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
});
