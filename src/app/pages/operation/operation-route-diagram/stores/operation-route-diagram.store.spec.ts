import { TestBed } from '@angular/core/testing';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { OperationRouteDiagramStore } from './operation-route-diagram.store';

const station = (stationId: string, routeIds: string[]) =>
    ({
        stationId,
        stationName: stationId,
        routeStationLists: routeIds.map((routeId) => ({
            route: { routeId, routeName: routeId },
        })),
    }) as never;

/** 本線（海老名・二俣川・横浜）といずみ野線（二俣川・湘南台）。運用は海老名→横浜だけを走る */
const stations = [
    station('ebina', ['honsen']),
    station('futamatagawa', ['honsen', 'izumino']),
    station('yokohama', ['honsen']),
    station('shonandai', ['izumino']),
];

describe('OperationRouteDiagramStore', () => {
    const save = jest.fn(() => Promise.resolve());
    const restore = jest.fn();
    let store: InstanceType<typeof OperationRouteDiagramStore>;

    beforeEach(() => {
        save.mockClear();
        restore.mockReset();
        TestBed.configureTestingModule({
            providers: [
                { provide: OfflineSnapshots, useValue: { save, restore } },
            ],
        });
        store = TestBed.inject(OperationRouteDiagramStore);
        store.setStations(stations);
        store.setOperationTrips({
            trips: [
                {
                    startTime: { stationId: 'ebina' },
                    endTime: { stationId: 'yokohama' },
                },
            ],
        } as never);
    });

    it('路線を何も選んでいなければ、経由する路線の駅だけを出す（経由しない路線の駅は出さない）', () => {
        store.setSelectedRouteIds([]);

        expect(store.visibleStations().map((s) => s.stationId)).toEqual([
            'ebina',
            'futamatagawa',
            'yokohama',
        ]);
    });

    it('路線を選んでいればその路線の駅を出す', () => {
        store.setSelectedRouteIds(['izumino']);

        expect(store.visibleStations().map((s) => s.stationId)).toEqual([
            'futamatagawa',
            'shonandai',
        ]);
    });

    it('routeOptions: 関連する路線だけを出し、経由しない路線は disabled', () => {
        expect(store.routeOptions()).toEqual([
            { value: 'honsen', label: 'honsen', disabled: false },
            { value: 'izumino', label: 'izumino', disabled: true },
        ]);
    });

    it('calendar / calendarId / operation: 取った運用から取り出す', () => {
        expect(store.operation()).toBeUndefined();
        expect(store.calendarId()).toBeUndefined();

        store.setOperationTrips({
            operation: {
                operationId: 'op-1',
                calendarId: 'cal-1',
                calendar: { calendarId: 'cal-1' },
            },
            trips: [],
        } as never);

        expect(store.operation()).toEqual(
            expect.objectContaining({ operationId: 'op-1' }),
        );
        expect(store.calendarId()).toBe('cal-1');
        expect(store.calendar()).toEqual({ calendarId: 'cal-1' });
    });

    it('tripOperationLists: 行路が無ければ undefined、あれば駅の読み替えを当てて返す', () => {
        store.setOperationTrips(null);
        expect(store.tripOperationLists()).toBeUndefined();

        store.setOperationTrips({
            trips: [
                {
                    startTime: { stationId: 'ebina' },
                    endTime: { stationId: 'shonandai' },
                },
            ],
        } as never);
        store.setStationAliases({ shonandai: 'yokohama' });

        expect(
            store
                .tripOperationLists()
                ?.map((t) => [t.startTime.stationId, t.endTime.stationId]),
        ).toEqual([['ebina', 'yokohama']]);
    });

    it('isAwaitingOperationTrips: 運用番号があって取り終えるまでの間だけ true', () => {
        expect(store.isAwaitingOperationTrips()).toBe(false);

        store.setOperationId('op-1');
        expect(store.isAwaitingOperationTrips()).toBe(true);

        store.setHasFetchedOperationTrips(true);
        expect(store.isAwaitingOperationTrips()).toBe(false);
    });

    it('isLoading / resetLoading: 読み込み中の数が 1 以上の間だけ true', () => {
        expect(store.isLoading()).toBe(false);

        store.enableLoading();
        store.enableLoading();
        store.disableLoading();
        expect(store.isLoading()).toBe(true);

        store.resetLoading();
        expect(store.isLoading()).toBe(false);
    });

    it('initializeSelectedRouteIds: 運用が経由する路線を選ぶ', () => {
        store.initializeSelectedRouteIds();

        expect(store.selectedRouteIds()).toEqual(['honsen']);
    });

    it('snapshot / restoreSnapshot: 中身だけを出し入れし、条件と選択は触らない', () => {
        store.setOperationId('op-1');
        store.setSelectedRouteIds(['honsen']);
        const data = {
            operationTrips: { trips: [] },
            itineraryLinks: [{ tripOperationListId: 'link-1' }],
            stations: [{ stationId: 'st-1' }],
            stationAliases: { 'st-2': 'st-1' },
        } as never;

        store.restoreSnapshot(data);

        expect(store.snapshot()).toEqual(data);
        expect(store.operationId()).toBe('op-1');
        expect(store.selectedRouteIds()).toEqual(['honsen']);
    });

    it('取得の世代番号: いちばん新しい番号だけが最新', () => {
        const first = store.nextFetchSeq();
        const second = store.nextFetchSeq();

        expect(second).toBe(first + 1);
        expect(store.isLatestFetch(first)).toBe(false);
        expect(store.isLatestFetch(second)).toBe(true);
    });

    it('ダイヤの替えの世代番号: 取得の世代番号とは別に数える', () => {
        const fetchSeq = store.nextFetchSeq();
        const first = store.nextCalendarChangeSeq();
        const second = store.nextCalendarChangeSeq();

        expect(second).toBe(first + 1);
        expect(store.isLatestCalendarChange(first)).toBe(false);
        expect(store.isLatestCalendarChange(second)).toBe(true);
        expect(store.isLatestFetch(fetchSeq)).toBe(true);
    });

    it('圏外の保存: キー OperationRouteDiagram で、いまの中身を条件つきで保存・戻す', async () => {
        const conditions = { operationId: 'op-1' };

        await store.saveOfflineSnapshot('main', conditions);

        expect(save).toHaveBeenCalledWith({
            key: 'OperationRouteDiagram',
            conditions,
            data: {
                operationTrips: expect.anything(),
                itineraryLinks: [],
                stations,
                stationAliases: {},
            },
        });

        restore.mockImplementation(
            (params: { apply: (data: unknown, savedAt: number) => void }) => {
                params.apply(
                    {
                        operationTrips: null,
                        itineraryLinks: [],
                        stations: [{ stationId: 'st-2' }],
                        stationAliases: {},
                    },
                    0,
                );
                return Promise.resolve(null);
            },
        );
        await store.restoreOfflineSnapshot('main', conditions);

        expect(restore).toHaveBeenCalledWith({
            key: 'OperationRouteDiagram',
            conditions,
            apply: expect.any(Function),
        });
        expect(store.stations()).toEqual([{ stationId: 'st-2' }]);
    });
});

describe('OperationRouteDiagramStore の操作帯の保存', () => {
    const getItem = jest.fn();
    const setItem = jest.fn();
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    beforeEach(() => {
        getItem.mockReset();
        setItem.mockReset();
        getItem.mockResolvedValue(null);
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

    it('初めは false で、set すると変わる', () => {
        const store = TestBed.inject(OperationRouteDiagramStore);
        expect(store.controlCollapsed()).toBe(false);

        store.setControlCollapsed(true);
        expect(store.controlCollapsed()).toBe(true);
    });

    it('端末には controlCollapsed だけを、ストア名のキーで書く', async () => {
        const store = TestBed.inject(OperationRouteDiagramStore);
        await flush();
        expect(getItem).toHaveBeenCalledWith('OperationRouteDiagramStore');

        store.setControlCollapsed(true);
        await flush();

        expect(setItem).toHaveBeenLastCalledWith({
            key: 'OperationRouteDiagramStore',
            value: { controlCollapsed: true },
        });
    });

    it('保存してある畳み状態を戻し、settingsReady を true にする', async () => {
        getItem.mockResolvedValue({ controlCollapsed: true });

        const store = TestBed.inject(OperationRouteDiagramStore);
        await flush();

        expect(store.controlCollapsed()).toBe(true);
        expect(store.settingsReady()).toBe(true);
    });
});
