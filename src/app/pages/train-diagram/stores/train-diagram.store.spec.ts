import { TestBed } from '@angular/core/testing';
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { StationAxis, stationToY } from 'src/app/shared/diagram-scale';
import { TrainDiagramStore } from './train-diagram.store';

function makeRoute(
    routeId: string,
    stationIds: readonly string[],
): RouteDetailsDto {
    return {
        routeId,
        routeStationLists: stationIds.map((stationId) => ({
            routeStationListId: `${routeId}-${stationId}`,
            routeId,
            stationId,
            station: { stationId } as any,
        })),
    } as RouteDetailsDto;
}

function hasStation(axis: StationAxis | null, stationId: string): boolean {
    return (axis ?? []).some((entry) => entry.stationId === stationId);
}

function makeStation(stationId: string, routeIds: string[]): StationDetailsDto {
    return {
        stationId,
        stationName: stationId,
        routeStationLists: routeIds.map((routeId) => ({
            routeStationListId: `${stationId}-${routeId}`,
            route: { routeId, routeName: routeId },
        })),
    } as StationDetailsDto;
}

function tripFixture(params: {
    tripId: string;
    tripClassName?: string;
    times: {
        stationId: string;
        stopSequence: number;
        arrivalTime?: string;
        departureTime?: string;
    }[];
}): any {
    return {
        tripId: params.tripId,
        tripClass: params.tripClassName
            ? { tripClassName: params.tripClassName }
            : undefined,
        times: params.times.map((t) => ({
            stationId: t.stationId,
            stopSequence: t.stopSequence,
            arrivalTime: t.arrivalTime,
            arrivalDays: 1,
            departureTime: t.departureTime,
            departureDays: 1,
        })),
    };
}

describe('TrainDiagramStore', () => {
    const getItem = jest.fn();
    const setItem = jest.fn();
    const save = jest.fn();
    const restore = jest.fn();
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    beforeEach(() => {
        getItem.mockReset();
        getItem.mockResolvedValue(null);
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

    it('setCalendarId / calendarId が同期する', () => {
        const store = TestBed.inject(TrainDiagramStore);
        store.setCalendarId('cal-1');
        expect(store.calendarId()).toBe('cal-1');
    });

    it('setSelectedRouteIds / selectedRouteIds が同期する', () => {
        const store = TestBed.inject(TrainDiagramStore);
        store.setSelectedRouteIds(['route-1', 'route-2']);
        expect(store.selectedRouteIds()).toEqual(['route-1', 'route-2']);
    });

    it('setPxPerMinute / setAxisPxPerMinute: 上限・下限に収めて入れる', () => {
        const store = TestBed.inject(TrainDiagramStore);
        store.setPxPerMinute(100);
        expect(store.pxPerMinute()).toBe(40);
        store.setPxPerMinute(1);
        expect(store.pxPerMinute()).toBe(4);
        store.setAxisPxPerMinute(50);
        expect(store.axisPxPerMinute()).toBe(24);
        store.setPxPerMinute(10);
        store.setAxisPxPerMinute(null);
    });

    it('axisPxPerMinute: 既定は null（自動）。Ctrl+ホイール等で明示的に入れると数値になり、null に戻すと自動に戻る（Task 13 フィックス）', () => {
        const store = TestBed.inject(TrainDiagramStore);
        expect(store.axisPxPerMinute()).toBeNull();

        store.setAxisPxPerMinute(10);
        expect(store.axisPxPerMinute()).toBe(10);

        store.setAxisPxPerMinute(null);
        expect(store.axisPxPerMinute()).toBeNull();
    });

    it('enableLoading/disableLoading: キューの増減で isLoading が切り替わる', () => {
        const store = TestBed.inject(TrainDiagramStore);
        store.enableLoading();
        expect(store.isLoading()).toBe(true);

        store.disableLoading();
        expect(store.isLoading()).toBe(false);
    });

    it('resetLoading: キューを空にする', () => {
        const store = TestBed.inject(TrainDiagramStore);
        store.enableLoading();
        store.resetLoading();
        expect(store.isLoading()).toBe(false);
    });

    it('setOperationSightingTimeCrossSection: operationNumber をキーに保持する', () => {
        const store = TestBed.inject(TrainDiagramStore);
        const dto = { latestSighting: null, expectedSighting: {} } as any;
        store.setOperationSightingTimeCrossSection('11', dto);

        expect(store.operationSightingTimeCrossSections()['11']).toBe(dto);
    });

    describe('stationAxisStations: networkStations（全線時刻表順）順序維持のフィルタ', () => {
        const honsenOnly = makeStation('st-honsen', ['honsen']);
        const branch = makeStation('st-branch', ['honsen', 'izumino']);
        const izuminoOnly = makeStation('st-izumino', ['izumino']);
        const networkStations = [honsenOnly, branch, izuminoOnly];
        const routeStations = [
            makeRoute('honsen', ['st-honsen', 'st-branch']),
            makeRoute('izumino', ['st-branch', 'st-izumino']),
        ];

        it('路線を何も選んでいないときは networkStations をそのまま返す（絞り込みは「空＝全部」）', () => {
            const store = TestBed.inject(TrainDiagramStore);
            store.setNetworkStations(networkStations);
            store.setRouteStations(routeStations);
            store.setSelectedRouteIds([]);

            expect(store.stationAxisStations()).toEqual(networkStations);
        });

        it('単一路線選択時は networkStations の相対順を維持しつつ選択路線の駅のみに絞り込み、非選択路線の駅（st-izumino）を除外する', () => {
            const store = TestBed.inject(TrainDiagramStore);
            store.setNetworkStations(networkStations);
            store.setRouteStations(routeStations);
            store.setSelectedRouteIds(['honsen']);

            expect(store.stationAxisStations().map((s) => s.stationId)).toEqual(
                ['st-honsen', 'st-branch'],
            );
        });

        it('複数路線選択時は networkStations の順序のまま選択路線いずれかに属する駅のみを残す', () => {
            const store = TestBed.inject(TrainDiagramStore);
            store.setNetworkStations(networkStations);
            store.setRouteStations(routeStations);
            store.setSelectedRouteIds(['honsen', 'izumino']);

            expect(store.stationAxisStations().map((s) => s.stationId)).toEqual(
                ['st-honsen', 'st-branch', 'st-izumino'],
            );
        });
    });

    describe('stationAxis: 直通列車が軸上で連続する（路線を跨いだ地理順マージ軸）', () => {
        const honsenOnly = makeStation('yokohama', ['honsen']);
        const branch = makeStation('futamatagawa', ['honsen', 'izumino']);
        const izuminoOnly = makeStation('shonandai', ['izumino']);
        const networkStations = [honsenOnly, branch, izuminoOnly];
        const routeStations = [
            makeRoute('honsen', ['yokohama', 'futamatagawa']),
            makeRoute('izumino', ['futamatagawa', 'shonandai']),
        ];

        it('本線・いずみ野線を跨ぐ直通列車の全停車駅が単一の駅軸に載る', () => {
            const store = TestBed.inject(TrainDiagramStore);
            store.setNetworkStations(networkStations);
            store.setRouteStations(routeStations);
            store.setSelectedRouteIds(['honsen', 'izumino']);

            const throughTrip = tripFixture({
                tripId: 'trip-through',
                tripClassName: '各停',
                times: [
                    {
                        stationId: 'yokohama',
                        stopSequence: 1,
                        departureTime: '07:00:00',
                    },
                    {
                        stationId: 'futamatagawa',
                        stopSequence: 2,
                        arrivalTime: '07:20:00',
                        departureTime: '07:21:00',
                    },
                    {
                        stationId: 'shonandai',
                        stopSequence: 3,
                        arrivalTime: '07:35:00',
                    },
                ],
            });
            store.setTripBlocksByDirection({
                0: [{ tripBlockId: 'b1', trips: [throughTrip] }],
            });

            const axis = store.stationAxis();
            // 3 駅すべてが同一駅軸に載り、直通列車の全区間を単調増加のyで表現できる
            // （= build-trip-diagram-line で 1 本の連続した線になる）
            expect(hasStation(axis, 'yokohama')).toBe(true);
            expect(hasStation(axis, 'futamatagawa')).toBe(true);
            expect(hasStation(axis, 'shonandai')).toBe(true);
            const yYokohama = axis ? stationToY('yokohama', axis) : 0;
            const yFutamatagawa = axis ? stationToY('futamatagawa', axis) : 0;
            const yShonandai = axis ? stationToY('shonandai', axis) : 0;
            expect(yYokohama).toBeLessThan(yFutamatagawa);
            expect(yFutamatagawa).toBeLessThan(yShonandai);
        });

        it('いずみ野線を選択から外すと直通列車の後半区間の駅が軸から消える（端点ラベル対象になる）', () => {
            const store = TestBed.inject(TrainDiagramStore);
            store.setNetworkStations(networkStations);
            store.setRouteStations(routeStations);
            store.setSelectedRouteIds(['honsen']);

            const axis = store.stationAxis();
            expect(hasStation(axis, 'yokohama')).toBe(true);
            expect(hasStation(axis, 'futamatagawa')).toBe(true);
            expect(hasStation(axis, 'shonandai')).toBe(false);
        });

        it('駅が無いときは null', () => {
            const store = TestBed.inject(TrainDiagramStore);
            expect(store.stationAxis()).toBeNull();
        });
    });

    describe('取得の世代番号', () => {
        it('nextFetchSeq は進め、currentFetchSeq は進めずにいまの番号を返す', () => {
            const store = TestBed.inject(TrainDiagramStore);
            const first = store.nextFetchSeq();
            expect(store.currentFetchSeq()).toBe(first);
            expect(store.currentFetchSeq()).toBe(first);

            const second = store.nextFetchSeq();
            expect(second).toBe(first + 1);
            expect(store.currentFetchSeq()).toBe(second);
        });

        it('新しい番号だけが最新になる', () => {
            const store = TestBed.inject(TrainDiagramStore);
            const first = store.nextFetchSeq();
            const second = store.nextFetchSeq();

            expect(store.isLatestFetch(first)).toBe(false);
            expect(store.isLatestFetch(second)).toBe(true);
        });

        it('世代を進めない取得が持つ番号は、あとから進んだら最新でなくなる', () => {
            const store = TestBed.inject(TrainDiagramStore);
            const held = store.currentFetchSeq();
            expect(store.isLatestFetch(held)).toBe(true);

            store.nextFetchSeq();
            expect(store.isLatestFetch(held)).toBe(false);
        });
    });

    describe('圏外の保存', () => {
        const conditions = { calendarId: 'cal-1', routeIds: 'r1' };

        it('main: 駅・路線・種別・列車・つながりだけを、同じキーで保存する', async () => {
            const store = TestBed.inject(TrainDiagramStore);
            const networkStations = [makeStation('st-1', ['r1'])];
            const routeStations = [makeRoute('r1', ['st-1'])];
            const tripClasses = [{ tripClassId: 'tc' }] as any;
            const tripBlocksByDirection = { 0: [{ tripBlockId: 'b1' }] } as any;
            const itineraryLinks = [{ operationId: 'op' }] as any;
            store.setNetworkStations(networkStations);
            store.setRouteStations(routeStations);
            store.setTripClasses(tripClasses);
            store.setTripBlocksByDirection(tripBlocksByDirection);
            store.setItineraryLinks(itineraryLinks);
            store.setCalendarId('cal-1');
            store.setPxPerMinute(20);

            await store.saveOfflineSnapshot('main', conditions);

            expect(save).toHaveBeenCalledWith({
                key: 'TrainDiagram',
                conditions,
                data: {
                    networkStations,
                    routeStations,
                    tripClasses,
                    tripBlocksByDirection,
                    itineraryLinks,
                },
            });
        });

        it('main: 戻すと中身だけを入れ、条件と画面の設定は今のまま', async () => {
            const store = TestBed.inject(TrainDiagramStore);
            store.setCalendarId('cal-keep');
            store.setSelectedRouteIds(['keep']);
            store.setPxPerMinute(20);
            const networkStations = [makeStation('st-9', ['r9'])];
            restore.mockImplementation(
                (params: {
                    apply: (data: unknown, savedAt: number) => void;
                }) => {
                    params.apply(
                        {
                            networkStations,
                            routeStations: [],
                            tripClasses: [],
                            tripBlocksByDirection: {},
                            itineraryLinks: [],
                        },
                        0,
                    );
                    return Promise.resolve(null);
                },
            );

            await store.restoreOfflineSnapshot('main', conditions);

            expect(restore).toHaveBeenCalledWith({
                key: 'TrainDiagram',
                conditions,
                apply: expect.any(Function),
            });
            expect(store.networkStations()).toEqual(networkStations);
            expect(store.calendarId()).toBe('cal-keep');
            expect(store.selectedRouteIds()).toEqual(['keep']);
            expect(store.pxPerMinute()).toBe(20);
        });

        it('sightings: 別のキーで、運用番号ごとの目撃を保存する', async () => {
            const store = TestBed.inject(TrainDiagramStore);
            const dto = { expectedSighting: { sightingTime: 'x' } } as any;
            store.setOperationSightingTimeCrossSection('51', dto);

            await store.saveOfflineSnapshot('sightings', conditions);

            expect(save).toHaveBeenCalledWith({
                key: 'TrainDiagramSightings',
                conditions,
                data: { '51': dto },
            });
        });

        it('sightings: 戻した目撃は、すでに取れている目撃を上書きしない', async () => {
            const store = TestBed.inject(TrainDiagramStore);
            const fresh = {
                expectedSighting: { sightingTime: 'fresh' },
            } as any;
            const saved = {
                expectedSighting: { sightingTime: 'saved' },
            } as any;
            store.setOperationSightingTimeCrossSection('52', fresh);
            restore.mockImplementation(
                (params: {
                    apply: (data: unknown, savedAt: number) => void;
                }) => {
                    params.apply(
                        {
                            '51': saved,
                            '52': {
                                expectedSighting: { sightingTime: 'old' },
                            },
                        },
                        0,
                    );
                    return Promise.resolve(null);
                },
            );

            await store.restoreOfflineSnapshot('sightings', conditions);

            expect(restore).toHaveBeenCalledWith({
                key: 'TrainDiagramSightings',
                conditions,
                apply: expect.any(Function),
            });
            expect(store.operationSightingTimeCrossSections()).toEqual({
                '51': saved,
                '52': fresh,
            });
        });
    });
});
