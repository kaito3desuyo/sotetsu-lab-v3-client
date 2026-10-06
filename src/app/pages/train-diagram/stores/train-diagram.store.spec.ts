import localForage from 'localforage';
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
    afterEach(() => {
        TrainDiagramStore.setCalendarId(null);
        TrainDiagramStore.setSelectedRouteIds([]);
        TrainDiagramStore.setSelectedTripId(null);
        TrainDiagramStore.setNetworkStations([]);
        TrainDiagramStore.setRouteStations([]);
        TrainDiagramStore.setTripBlocksByDirection({});
        TrainDiagramStore.resetLoading();
    });

    it('setCalendarId / calendarId が同期する', () => {
        TrainDiagramStore.setCalendarId('cal-1');
        expect(TrainDiagramStore.calendarId).toBe('cal-1');
    });

    it('setSelectedRouteIds / selectedRouteIds が同期する', () => {
        TrainDiagramStore.setSelectedRouteIds(['route-1', 'route-2']);
        expect(TrainDiagramStore.selectedRouteIds).toEqual([
            'route-1',
            'route-2',
        ]);
    });

    it('setPxPerMinute / setAxisPxPerMinute: 上限・下限に収めて入れる', () => {
        TrainDiagramStore.setPxPerMinute(100);
        expect(TrainDiagramStore.pxPerMinute).toBe(40);
        TrainDiagramStore.setPxPerMinute(1);
        expect(TrainDiagramStore.pxPerMinute).toBe(4);
        TrainDiagramStore.setAxisPxPerMinute(50);
        expect(TrainDiagramStore.axisPxPerMinute).toBe(24);
        TrainDiagramStore.setPxPerMinute(10);
        TrainDiagramStore.setAxisPxPerMinute(null);
    });

    it('axisPxPerMinute: 既定は null（自動）。Ctrl+ホイール等で明示的に入れると数値になり、null に戻すと自動に戻る（Task 13 フィックス）', () => {
        expect(TrainDiagramStore.axisPxPerMinute).toBeNull();

        TrainDiagramStore.setAxisPxPerMinute(10);
        expect(TrainDiagramStore.axisPxPerMinute).toBe(10);

        TrainDiagramStore.setAxisPxPerMinute(null);
        expect(TrainDiagramStore.axisPxPerMinute).toBeNull();
    });

    it('enableLoading/disableLoading: キューの増減で isLoading$ が切り替わる', (done) => {
        TrainDiagramStore.enableLoading();
        TrainDiagramStore.isLoading$.subscribe((isLoading) => {
            expect(isLoading).toBe(true);
            done();
        });
    });

    it('resetLoading: キューを空にする', (done) => {
        TrainDiagramStore.enableLoading();
        TrainDiagramStore.resetLoading();
        TrainDiagramStore.isLoading$.subscribe((isLoading) => {
            expect(isLoading).toBe(false);
            done();
        });
    });

    it('setOperationSightingTimeCrossSection: operationNumber をキーに保持する', (done) => {
        const dto = { latestSighting: null, expectedSighting: {} } as any;
        TrainDiagramStore.setOperationSightingTimeCrossSection('11', dto);

        TrainDiagramStore.operationSightingTimeCrossSections$.subscribe(
            (state) => {
                expect(state['11']).toBe(dto);
                done();
            },
        );
    });

    describe('stationAxisStations$: networkStations（全線時刻表順）順序維持のフィルタ', () => {
        const honsenOnly = makeStation('st-honsen', ['honsen']);
        const branch = makeStation('st-branch', ['honsen', 'izumino']);
        const izuminoOnly = makeStation('st-izumino', ['izumino']);
        const networkStations = [honsenOnly, branch, izuminoOnly];
        const routeStations = [
            makeRoute('honsen', ['st-honsen', 'st-branch']),
            makeRoute('izumino', ['st-branch', 'st-izumino']),
        ];

        it('路線を何も選んでいないときは networkStations をそのまま返す（絞り込みは「空＝全部」）', (done) => {
            TrainDiagramStore.setNetworkStations(networkStations);
            TrainDiagramStore.setRouteStations(routeStations);
            TrainDiagramStore.setSelectedRouteIds([]);

            TrainDiagramStore.stationAxisStations$.subscribe((stations) => {
                expect(stations).toEqual(networkStations);
                done();
            });
        });

        it('単一路線選択時は networkStations の相対順を維持しつつ選択路線の駅のみに絞り込み、非選択路線の駅（st-izumino）を除外する', (done) => {
            TrainDiagramStore.setNetworkStations(networkStations);
            TrainDiagramStore.setRouteStations(routeStations);
            TrainDiagramStore.setSelectedRouteIds(['honsen']);

            TrainDiagramStore.stationAxisStations$.subscribe((stations) => {
                expect(stations.map((s) => s.stationId)).toEqual([
                    'st-honsen',
                    'st-branch',
                ]);
                done();
            });
        });

        it('複数路線選択時は networkStations の順序のまま選択路線いずれかに属する駅のみを残す', (done) => {
            TrainDiagramStore.setNetworkStations(networkStations);
            TrainDiagramStore.setRouteStations(routeStations);
            TrainDiagramStore.setSelectedRouteIds(['honsen', 'izumino']);

            TrainDiagramStore.stationAxisStations$.subscribe((stations) => {
                expect(stations.map((s) => s.stationId)).toEqual([
                    'st-honsen',
                    'st-branch',
                    'st-izumino',
                ]);
                done();
            });
        });
    });

    describe('stationAxis$: 直通列車が軸上で連続する（路線を跨いだ地理順マージ軸）', () => {
        const honsenOnly = makeStation('yokohama', ['honsen']);
        const branch = makeStation('futamatagawa', ['honsen', 'izumino']);
        const izuminoOnly = makeStation('shonandai', ['izumino']);
        const networkStations = [honsenOnly, branch, izuminoOnly];
        const routeStations = [
            makeRoute('honsen', ['yokohama', 'futamatagawa']),
            makeRoute('izumino', ['futamatagawa', 'shonandai']),
        ];

        it('本線・いずみ野線を跨ぐ直通列車の全停車駅が単一の駅軸に載る', (done) => {
            TrainDiagramStore.setNetworkStations(networkStations);
            TrainDiagramStore.setRouteStations(routeStations);
            TrainDiagramStore.setSelectedRouteIds(['honsen', 'izumino']);

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
            TrainDiagramStore.setTripBlocksByDirection({
                0: [{ tripBlockId: 'b1', trips: [throughTrip] }],
            });

            TrainDiagramStore.stationAxis$.subscribe((axis) => {
                // 3 駅すべてが同一駅軸に載り、直通列車の全区間を単調増加のyで表現できる
                // （= build-trip-diagram-line で 1 本の連続した線になる）
                expect(hasStation(axis, 'yokohama')).toBe(true);
                expect(hasStation(axis, 'futamatagawa')).toBe(true);
                expect(hasStation(axis, 'shonandai')).toBe(true);
                const yYokohama = axis ? stationToY('yokohama', axis) : 0;
                const yFutamatagawa = axis
                    ? stationToY('futamatagawa', axis)
                    : 0;
                const yShonandai = axis ? stationToY('shonandai', axis) : 0;
                expect(yYokohama).toBeLessThan(yFutamatagawa);
                expect(yFutamatagawa).toBeLessThan(yShonandai);
                done();
            });
        });

        it('いずみ野線を選択から外すと直通列車の後半区間の駅が軸から消える（端点ラベル対象になる）', (done) => {
            TrainDiagramStore.setNetworkStations(networkStations);
            TrainDiagramStore.setRouteStations(routeStations);
            TrainDiagramStore.setSelectedRouteIds(['honsen']);

            TrainDiagramStore.stationAxis$.subscribe((axis) => {
                expect(hasStation(axis, 'yokohama')).toBe(true);
                expect(hasStation(axis, 'futamatagawa')).toBe(true);
                expect(hasStation(axis, 'shonandai')).toBe(false);
                done();
            });
        });
    });

    describe('controlCollapsed の保存', () => {
        it('初めは false で、set すると流れる', (done) => {
            TrainDiagramStore.setControlCollapsed(true);
            TrainDiagramStore.controlCollapsed$.subscribe((value) => {
                expect(value).toBe(true);
                done();
            });
        });

        it('localForage には controlCollapsed だけを書く', async () => {
            const spy = jest.spyOn(localForage, 'setItem');
            TrainDiagramStore.setControlCollapsed(true);
            TrainDiagramStore.setControlCollapsed(false);
            await Promise.resolve();
            const calls = spy.mock.calls.filter(
                ([key]) => key === 'TrainDiagramStore',
            );
            expect(calls.length).toBeGreaterThan(0);
            for (const [, value] of calls) {
                expect(Object.keys(value as object)).toEqual([
                    'controlCollapsed',
                ]);
            }
        });
    });
});
