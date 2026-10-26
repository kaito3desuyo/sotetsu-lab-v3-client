import { NO_ERRORS_SCHEMA, PLATFORM_ID, Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import {
    ActivatedRoute,
    Router,
    convertToParamMap,
    provideRouter,
} from '@angular/router';
import {
    BehaviorSubject,
    Observable,
    Subject,
    firstValueFrom,
    of,
    throwError,
} from 'rxjs';
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { SsrResponse } from 'src/app/core/ssr/ssr-response';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { TrainDiagramComponent } from './train-diagram.component';
import { TrainDiagramService } from './services/train-diagram.service';
import { TrainDiagramStore } from './stores/train-diagram.store';

/**
 * 渡した駅の並びをそれぞれ 1 本の路線として置き、全部選ぶ。縮尺・線のつながりを見るテストは
 * これで駅軸と分岐駅の判定に使う路線をそろえる。
 */
function selectRoutesThrough(...routes: string[][]): void {
    TrainDiagramStore.setRouteStations(
        routes.map(
            (stationIds, index) =>
                ({
                    routeId: `fixture-route-${index}`,
                    routeName: `fixture-${index}`,
                    routeStationLists: stationIds.map((stationId) => ({
                        stationId,
                        station: { stationId, stationName: stationId },
                    })),
                }) as any,
        ),
    );
    TrainDiagramStore.setSelectedRouteIds(
        routes.map((_, index) => `fixture-route-${index}`),
    );
}

describe('TrainDiagramComponent', () => {
    let component: TrainDiagramComponent;
    let fixture: ComponentFixture<TrainDiagramComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainDiagramComponent],
            providers: [
                provideRouter([]),
                {
                    provide: TrainDiagramService,
                    useValue: {
                        fetchTripClasses: () => of(undefined),
                        fetchTripBlocks: () => of(undefined),
                        fetchItineraryLinks: () => of(undefined),
                        fetchNetworkStations: () => of(undefined),
                        fetchOperationSightingTimeCrossSection: () =>
                            of(undefined),
                    },
                },
                {
                    provide: TodaysCalendarListStateQuery,
                    useValue: {
                        todaysCalendarId: 'cal-today',
                        todaysCalendarIds$: of(['cal-today']),
                    },
                },
                {
                    provide: RouteStationListStateQuery,
                    useValue: {
                        routeStations$: of([
                            {
                                routeId: 'route-1',
                                routeName: '本線',
                                // Task 14: 最終の行先テストで駅名を引けるように、s1〜s5 の
                                // stationId → 駅名 を用意する（既存テストはこの詳細を使わない）。
                                routeStationLists: [
                                    's1',
                                    's2',
                                    's3',
                                    's4',
                                    's5',
                                ].map((stationId) => ({
                                    station: {
                                        stationId,
                                        stationName: `${stationId.toUpperCase()}駅`,
                                    },
                                })),
                            },
                        ]),
                    },
                },
            ],
        })
            .overrideComponent(TrainDiagramComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TrainDiagramComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        TrainDiagramStore.setCalendarId(null);
        TrainDiagramStore.setSelectedRouteIds([]);
        TrainDiagramStore.setSelectedTripId(null);
        TrainDiagramStore.setTripBlocksByDirection({});
        TrainDiagramStore.setDirectionFilter('both');
        TrainDiagramStore.setPxPerMinute(10);
        TrainDiagramStore.setAxisPxPerMinute(null);
        TrainDiagramStore.setNetworkStations([]);
        TrainDiagramStore.setHasFetchedTrainDiagram(false);
        TrainDiagramStore.resetLoading();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('onInfoPanelClosed: 選択列車をクリアする', () => {
        TrainDiagramStore.setSelectedTripId('t1');
        component.onInfoPanelClosed();
        expect(TrainDiagramStore.selectedTripId).toBeNull();
    });

    it('onZoomStep: 横の縮尺を次の段へ移す', () => {
        TrainDiagramStore.setPxPerMinute(10);
        component.onZoomStep(1);
        expect(TrainDiagramStore.pxPerMinute).toBe(16);

        TrainDiagramStore.setPxPerMinute(10);
        component.onZoomStep(-1);
        expect(TrainDiagramStore.pxPerMinute).toBe(6);
    });

    it('onTripActivated: 対象 trip が無くても例外を投げない', () => {
        expect(() => component.onTripActivated('unknown')).not.toThrow();
    });

    it('ロード中はプログレスバーだけを出し、スピナーは出さない', () => {
        TrainDiagramStore.enableLoading();
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelector('mat-progress-bar'),
        ).toBeTruthy();
        expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();

        TrainDiagramStore.disableLoading();
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelector('mat-progress-bar'),
        ).toBeNull();
        expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
    });

    it('fetchData: フェッチが reject しても isLoading が回復する（try/finally）', async () => {
        const service = TestBed.inject(TrainDiagramService) as {
            fetchTripBlocks: () => unknown;
        };
        service.fetchTripBlocks = () =>
            throwError(() => new Error('fetch failed'));

        await expect(
            component.fetchData({ refetchTripBlocks: true }),
        ).rejects.toThrow('fetch failed');

        expect(await firstValueFrom(TrainDiagramStore.isLoading$)).toBe(false);
    });

    it('列車を取り終わるまでは図の代わりに骨組みを出し、空表示も出さない', () => {
        TrainDiagramStore.setHasFetchedTrainDiagram(false);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(
            el.querySelector('[data-testid="train-diagram-skeleton"]'),
        ).not.toBeNull();
        expect(el.querySelector('app-train-diagram-chart')).toBeNull();
        expect(el.querySelector('app-empty-state')).toBeNull();
    });

    it('取り終えたら骨組みを消して図を出す', () => {
        TrainDiagramStore.setHasFetchedTrainDiagram(true);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(
            el.querySelector('[data-testid="train-diagram-skeleton"]'),
        ).toBeNull();
    });

    it('列車の取得が失敗しても骨組みを消す', async () => {
        const service = TestBed.inject(TrainDiagramService) as {
            fetchTripBlocks: () => unknown;
        };
        service.fetchTripBlocks = () =>
            throwError(() => new Error('fetch failed'));

        await component
            .fetchData({ refetchTripBlocks: true })
            .catch(() => undefined);

        expect(
            await firstValueFrom(TrainDiagramStore.hasFetchedTrainDiagram$),
        ).toBe(true);
    });

    it('路線・方向だけを変えた取得では骨組みに戻さない', async () => {
        await component.fetchData({ refetchTripBlocks: true });
        const pending = new Subject<undefined>();
        const service = TestBed.inject(TrainDiagramService) as {
            fetchTripBlocks: () => unknown;
        };
        service.fetchTripBlocks = () => pending;

        void component.fetchData({ refetchTripBlocks: false });

        expect(
            await firstValueFrom(TrainDiagramStore.hasFetchedTrainDiagram$),
        ).toBe(true);
    });

    it('ダイヤを変えた取得の途中で路線だけの取得が先に終わっても、骨組みのまま', async () => {
        await component.fetchData({ refetchTripBlocks: true });
        const pending = new Subject<undefined>();
        const service = TestBed.inject(TrainDiagramService) as {
            fetchTripBlocks: () => unknown;
        };
        service.fetchTripBlocks = () => pending;

        void component
            .fetchData({ refetchTripBlocks: true })
            .catch(() => undefined);
        await component.fetchData({ refetchTripBlocks: false });

        expect(
            await firstValueFrom(TrainDiagramStore.hasFetchedTrainDiagram$),
        ).toBe(false);
    });

    it('ページを離れてすぐ戻ったとき、前のインスタンスの取得が後から終わっても、新しい取得が終わるまで骨組みは消えない', async () => {
        // 実タイマーは使わない（コンストラクタの Router.navigate の失敗が他のテストに漏れるため）
        const flush = async () => {
            for (let i = 0; i < 20; i++) await Promise.resolve();
        };
        const service = TestBed.inject(TrainDiagramService) as {
            fetchTripBlocks: () => unknown;
        };
        let calls = 0;
        let tripBlocks$ = new Subject<undefined>();
        service.fetchTripBlocks = () => {
            calls++;
            return tripBlocks$;
        };

        void component
            .fetchData({ refetchTripBlocks: true })
            .catch(() => undefined);
        // 1 つ目の取得が fetchTripBlocks を購読するまで待つ（待たないと 1 つ目も新しい Subject を受け取る）
        await flush();
        expect(calls).toBe(1);
        const previousTripBlocks$ = tripBlocks$;
        fixture.destroy();

        tripBlocks$ = new Subject<undefined>();
        fixture = TestBed.createComponent(TrainDiagramComponent);
        component = fixture.componentInstance;
        void component
            .fetchData({ refetchTripBlocks: true })
            .catch(() => undefined);
        await flush();
        expect(calls).toBe(2);

        previousTripBlocks$.next(undefined);
        previousTripBlocks$.complete();
        await flush();
        expect(
            await firstValueFrom(TrainDiagramStore.hasFetchedTrainDiagram$),
        ).toBe(false);

        tripBlocks$.next(undefined);
        tripBlocks$.complete();
        await flush();
        expect(
            await firstValueFrom(TrainDiagramStore.hasFetchedTrainDiagram$),
        ).toBe(true);
    });

    it('highlightedTripIds: 続きのある2本を持つ block で片方を選ぶと、つながりの両方の tripId が入る', () => {
        TrainDiagramStore.setTripBlocksByDirection({
            0: [
                {
                    tripBlockId: 'b1',
                    trips: [
                        {
                            tripId: 't1',
                            tripNumber: '1',
                            times: [
                                {
                                    stationId: 's1',
                                    stopSequence: 1,
                                    departureTime: '07:00:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 's2',
                                    stopSequence: 2,
                                    arrivalTime: '07:10:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                            ],
                        },
                        {
                            tripId: 't2',
                            tripNumber: '2',
                            times: [
                                {
                                    stationId: 's2',
                                    stopSequence: 1,
                                    departureTime: '07:12:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 's3',
                                    stopSequence: 2,
                                    arrivalTime: '07:20:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                            ],
                        },
                        {
                            tripId: 't3',
                            tripNumber: '3',
                            times: [
                                {
                                    stationId: 's4',
                                    stopSequence: 1,
                                    departureTime: '08:00:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 's5',
                                    stopSequence: 2,
                                    arrivalTime: '08:10:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                            ],
                        },
                    ],
                } as any,
            ],
        });

        component.onTripSelected('t1');

        expect(Array.from(component.highlightedTripIds()).sort()).toEqual([
            't1',
            't2',
        ]);

        component.onTripSelected('t3');

        expect(Array.from(component.highlightedTripIds())).toEqual(['t3']);
    });

    it('filteredTripBlocksByDirection: directionFilter に応じて chart へ渡す列車を絞る', () => {
        TrainDiagramStore.setTripBlocksByDirection({
            0: [{ tripBlockId: 'b-up', trips: [] } as any],
            1: [{ tripBlockId: 'b-down', trips: [] } as any],
        });

        TrainDiagramStore.setDirectionFilter('both');
        expect(
            Object.keys(component.filteredTripBlocksByDirection()).sort(),
        ).toEqual(['0', '1']);

        TrainDiagramStore.setDirectionFilter('up');
        expect(Object.keys(component.filteredTripBlocksByDirection())).toEqual([
            '0',
        ]);

        TrainDiagramStore.setDirectionFilter('down');
        expect(Object.keys(component.filteredTripBlocksByDirection())).toEqual([
            '1',
        ]);
    });

    it('Task 14: selectedTripInfo.destinationName は種別変更・列番変更を含む最終の行先になる', () => {
        TrainDiagramStore.setTripBlocksByDirection({
            0: [
                {
                    tripBlockId: 'b1',
                    trips: [
                        {
                            tripId: 'p',
                            tripNumber: 'P',
                            times: [
                                {
                                    stationId: 's1',
                                    stopSequence: 1,
                                    departureTime: '07:00:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 's2',
                                    stopSequence: 2,
                                    arrivalTime: '07:10:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                            ],
                        },
                        {
                            tripId: 'q',
                            tripNumber: 'Q',
                            times: [
                                {
                                    stationId: 's2',
                                    stopSequence: 1,
                                    departureTime: '07:12:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 's3',
                                    stopSequence: 2,
                                    arrivalTime: '07:20:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                            ],
                        },
                    ],
                } as any,
            ],
        });

        // P(A=s1→B=s2) を選ぶ。P だけの終着は B(s2) だが、続く Q(B=s2→C=s3) の
        // 最後の停車駅 C(s3) が最終の行先になるはず。
        component.onTripSelected('p');

        expect(component.selectedTripInfo()?.destinationName).toBe('S3駅');
    });

    it('Task 14: 続きの無い列車の destinationName は今どおりその列車自身の終着', () => {
        TrainDiagramStore.setTripBlocksByDirection({
            0: [
                {
                    tripBlockId: 'b-solo',
                    trips: [
                        {
                            tripId: 'solo',
                            tripNumber: 'S',
                            times: [
                                {
                                    stationId: 's1',
                                    stopSequence: 1,
                                    departureTime: '07:00:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 's4',
                                    stopSequence: 2,
                                    arrivalTime: '07:10:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                            ],
                        },
                    ],
                } as any,
            ],
        });

        component.onTripSelected('solo');

        expect(component.selectedTripInfo()?.destinationName).toBe('S4駅');
    });

    it('Task 14（追加指示）: hasDepotOut/hasDepotIn は描かれた線の depotMarks から決まる', () => {
        TrainDiagramStore.setNetworkStations(
            ['s1', 's2'].map(
                (stationId, index) =>
                    ({
                        stationId,
                        stationName: stationId,
                        stationSequence: index + 1,
                    }) as any,
            ),
        );
        selectRoutesThrough(['s1', 's2']);
        TrainDiagramStore.setTripBlocksByDirection({
            0: [
                {
                    tripBlockId: 'b-depot',
                    trips: [
                        {
                            tripId: 'out-trip',
                            tripNumber: 'O',
                            depotOut: true,
                            times: [
                                {
                                    stationId: 's1',
                                    stopSequence: 1,
                                    departureTime: '07:00:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 's2',
                                    stopSequence: 2,
                                    arrivalTime: '07:10:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                            ],
                        },
                    ],
                } as any,
            ],
        });

        expect(component.hasDepotOut()).toBe(true);
        expect(component.hasDepotIn()).toBe(false);
    });

    it('fix round 1: 同じ運用・同じ方向で trip block をまたぐ列車は1つのつながりにまとまり、折り返しにしない', () => {
        TrainDiagramStore.setNetworkStations(
            ['s1', 's2', 's3'].map(
                (stationId, index) =>
                    ({
                        stationId,
                        stationName: stationId,
                        stationSequence: index + 1,
                    }) as any,
            ),
        );
        selectRoutesThrough(['s1', 's2', 's3']);
        TrainDiagramStore.setTripBlocksByDirection({
            0: [
                {
                    tripBlockId: 'b1',
                    trips: [
                        {
                            tripId: 'p1',
                            tripNumber: 'P1',
                            tripDirection: 0,
                            tripOperationLists: [
                                { operationId: 'op-1' } as any,
                            ],
                            times: [
                                {
                                    stationId: 's1',
                                    stopSequence: 1,
                                    departureTime: '07:00:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 's2',
                                    stopSequence: 2,
                                    arrivalTime: '07:10:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                            ],
                        },
                    ],
                } as any,
                {
                    // 別の trip block（同じ運用・同じ方向で続く。findContinuations は
                    // trip block をまたがないため、これは別チェーンとして始まる）。
                    tripBlockId: 'b2',
                    trips: [
                        {
                            tripId: 'p2',
                            tripNumber: 'P2',
                            tripDirection: 0,
                            tripOperationLists: [
                                { operationId: 'op-1' } as any,
                            ],
                            times: [
                                {
                                    stationId: 's2',
                                    stopSequence: 1,
                                    departureTime: '07:15:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 's3',
                                    stopSequence: 2,
                                    arrivalTime: '07:30:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                            ],
                        },
                    ],
                } as any,
            ],
        });

        // 1本のつながりにまとまるため、片方を選ぶと両方が強調される。
        expect(
            Array.from(component.tripIdsByChainOf().get('p1') ?? []).sort(),
        ).toEqual(['p1', 'p2']);
        expect(
            Array.from(component.tripIdsByChainOf().get('p2') ?? []).sort(),
        ).toEqual(['p1', 'p2']);

        // 向きが変わっていない継続なので、折り返しのコの字リンクは作られない。
        expect(component.turnbackLinks()).toEqual([]);
    });

    it('fix round 1: 同じ運用でも向きが変われば折り返しのコの字リンクを作る', () => {
        TrainDiagramStore.setNetworkStations(
            ['s1', 's2', 's3'].map(
                (stationId, index) =>
                    ({
                        stationId,
                        stationName: stationId,
                        stationSequence: index + 1,
                    }) as any,
            ),
        );
        selectRoutesThrough(['s1', 's2', 's3']);
        TrainDiagramStore.setTripBlocksByDirection({
            0: [
                {
                    tripBlockId: 'b1',
                    trips: [
                        {
                            tripId: 'p1',
                            tripNumber: 'P1',
                            tripDirection: 0,
                            tripOperationLists: [
                                { operationId: 'op-1' } as any,
                            ],
                            times: [
                                {
                                    stationId: 's1',
                                    stopSequence: 1,
                                    departureTime: '07:00:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 's2',
                                    stopSequence: 2,
                                    arrivalTime: '07:10:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                            ],
                        },
                    ],
                } as any,
            ],
            1: [
                {
                    tripBlockId: 'b2',
                    trips: [
                        {
                            tripId: 'p2',
                            tripNumber: 'P2',
                            tripDirection: 1,
                            tripOperationLists: [
                                { operationId: 'op-1' } as any,
                            ],
                            times: [
                                {
                                    stationId: 's2',
                                    stopSequence: 1,
                                    departureTime: '07:15:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 's1',
                                    stopSequence: 2,
                                    arrivalTime: '07:30:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                            ],
                        },
                    ],
                } as any,
            ],
        });

        // 別のつながりのまま（方向が違うので merge されない）。
        expect(
            Array.from(component.tripIdsByChainOf().get('p1') ?? []),
        ).toEqual(['p1']);
        expect(
            Array.from(component.tripIdsByChainOf().get('p2') ?? []),
        ).toEqual(['p2']);

        // 向きが変わる継続 = 折り返しなので、コの字リンクが1本作られる。
        expect(component.turnbackLinks().length).toBe(1);
        expect(component.turnbackLinks()[0]).toMatchObject({
            arrivingTripId: 'p1',
            departingTripId: 'p2',
        });
    });

    /**
     * Task 13 フィックス用の固定データ: A→B→C を2本の列車（各停寄り・急行寄り）で走らせ、
     * D は誰も走らない継ぎ目（観測なし）にする。A-B・B-C は観測あり（A-B が最小二乗後に
     * 最小の区間）、C-D は観測なしで λ の引き寄せ値がそのまま使われる旧実装の再現条件。
     */
    function setupScaleFixture(): void {
        TrainDiagramStore.setNetworkStations(
            ['A', 'B', 'C', 'D'].map(
                (stationId, index) =>
                    ({
                        stationId,
                        stationName: stationId,
                        stationSequence: index + 1,
                    }) as any,
            ),
        );
        selectRoutesThrough(['A', 'B', 'C', 'D']);
        TrainDiagramStore.setTripBlocksByDirection({
            0: [
                {
                    tripBlockId: 'b-local',
                    trips: [
                        {
                            tripId: 'local-1',
                            tripNumber: 'L1',
                            times: [
                                {
                                    stationId: 'A',
                                    stopSequence: 1,
                                    departureTime: '07:00:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 'B',
                                    stopSequence: 2,
                                    arrivalTime: '07:03:00',
                                    departureTime: '07:03:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 'C',
                                    stopSequence: 3,
                                    arrivalTime: '07:06:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                            ],
                        },
                    ],
                } as any,
                {
                    tripBlockId: 'b-fast',
                    trips: [
                        {
                            tripId: 'fast-1',
                            tripNumber: 'F1',
                            times: [
                                {
                                    stationId: 'A',
                                    stopSequence: 1,
                                    departureTime: '07:20:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 'B',
                                    stopSequence: 2,
                                    arrivalTime: '07:21:00',
                                    departureTime: '07:21:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 'C',
                                    stopSequence: 3,
                                    arrivalTime: '07:24:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                            ],
                        },
                    ],
                } as any,
            ],
        });
    }

    it('Task 13 フィックス（縦の縮尺・自動）: 観測のある駅間はどれも最小行高16px以上で比例', () => {
        TrainDiagramStore.setAxisPxPerMinute(null); // 自動（既定）
        setupScaleFixture();

        const rows = component.stationRows();
        expect(rows.map((r) => r.stationId)).toEqual(['A', 'B', 'C', 'D']);

        const gapAB = rows[1].y - rows[0].y;
        const gapBC = rows[2].y - rows[1].y;
        const gapCD = rows[3].y - rows[2].y;

        // A-B は最小二乗後に最小の観測区間になるため、自動縮尺でちょうど最小行高(16px)に
        // 合わせられる。B-C はそれより長い所要分なので比例して大きい（=底上げで潰れない）。
        expect(gapAB).toBeCloseTo(16, 5);
        expect(gapBC).toBeGreaterThan(gapAB);

        // Task 14（コントローラ判断）: C-D は誰も走らない継ぎ目（観測なし）だが、
        // A・B・C・D はどれも軸に1回しか出ない（複製した駅の行の前後ではない）ため、
        // もう 16px には圧縮せず、最小二乗の結果（λ の正則化で初期値へ寄った値）を
        // そのまま使う。総延長（A→D）は最小二乗前後で保たれる（fitStationAxisToTrips が
        // 最後に全体を初期の長さへスケールし直すため）ので、
        // gapCD = 9分(初期の総延長) * px − gapAB − gapBC が成り立つ。
        const px = component.effectiveAxisPxPerMinute();
        const expectedGapCD = 9 * px - gapAB - gapBC;
        expect(gapCD).toBeCloseTo(expectedGapCD, 5);
        expect(gapCD).not.toBeCloseTo(16, 1);
    });

    it('Task 13 フィックス（縦の縮尺・手動）: 明示的な値でも観測区間の比例は保たれる', () => {
        TrainDiagramStore.setAxisPxPerMinute(null);
        setupScaleFixture();

        const autoRows = component.stationRows();
        const autoRatio =
            (autoRows[2].y - autoRows[1].y) / (autoRows[1].y - autoRows[0].y);

        component.onAxisPxPerMinuteChange(10);

        const rows = component.stationRows();
        const gapAB = rows[1].y - rows[0].y;
        const gapBC = rows[2].y - rows[1].y;
        const gapCD = rows[3].y - rows[2].y;

        // 縮尺を変えても観測区間どうしの比（最小二乗の結果）は保たれる。
        expect(gapBC / gapAB).toBeCloseTo(autoRatio, 3);
        // Task 14: 複製の前後でない C-D は縮尺（自動/手動）によらず、同じ
        // 「9分 * px − gapAB − gapBC」の関係を保つ（もう固定16pxではない）。
        expect(gapCD).toBeCloseTo(9 * 10 - gapAB - gapBC, 5);
    });

    /**
     * Task 14（コントローラ判断）: 圧縮の対象は「観測ゼロ **かつ** その駅間の
     * 片方の端が複製した駅の行（軸に2回以上出るstationId）」だけにする。
     * A→B→C→B(複製)→D→E という軸を作り、B が2回出る前後（C-B(複製)・B(複製)-D）は
     * 観測ゼロでも 16px に圧縮し、複製の前後でない D-E（観測ゼロ）は圧縮しない。
     */
    function setupDuplicatedJunctionFixture(): void {
        TrainDiagramStore.setNetworkStations(
            ['A', 'B', 'C', 'B', 'D', 'E'].map(
                (stationId, index) =>
                    ({
                        stationId,
                        stationName: stationId,
                        stationSequence: index + 1,
                    }) as any,
            ),
        );
        selectRoutesThrough(['A', 'B', 'C'], ['B', 'D', 'E']);
        TrainDiagramStore.setTripBlocksByDirection({
            0: [
                {
                    tripBlockId: 'b-local',
                    trips: [
                        {
                            tripId: 'local-1',
                            tripNumber: 'L1',
                            times: [
                                {
                                    stationId: 'A',
                                    stopSequence: 1,
                                    departureTime: '07:00:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 'B',
                                    stopSequence: 2,
                                    arrivalTime: '07:03:00',
                                    departureTime: '07:03:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 'C',
                                    stopSequence: 3,
                                    arrivalTime: '07:06:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                            ],
                        },
                    ],
                } as any,
                {
                    tripBlockId: 'b-fast',
                    trips: [
                        {
                            tripId: 'fast-1',
                            tripNumber: 'F1',
                            times: [
                                {
                                    stationId: 'A',
                                    stopSequence: 1,
                                    departureTime: '07:20:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 'B',
                                    stopSequence: 2,
                                    arrivalTime: '07:21:00',
                                    departureTime: '07:21:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                                {
                                    stationId: 'C',
                                    stopSequence: 3,
                                    arrivalTime: '07:24:00',
                                    arrivalDays: 1,
                                    departureDays: 1,
                                },
                            ],
                        },
                    ],
                } as any,
            ],
        });
    }

    it('Task 14: 複製した駅の行の前後（観測ゼロ）は16pxに圧縮し、複製の前後でない観測ゼロの駅間は最小二乗の値のまま', () => {
        TrainDiagramStore.setAxisPxPerMinute(null);
        setupDuplicatedJunctionFixture();

        const rows = component.stationRows();
        expect(rows.map((r) => r.stationId)).toEqual([
            'A',
            'B',
            'C',
            'B',
            'D',
            'E',
        ]);

        const gapAB = rows[1].y - rows[0].y;
        const gapBC = rows[2].y - rows[1].y;
        const gapC_Bdup = rows[3].y - rows[2].y;
        const gapBdup_D = rows[4].y - rows[3].y;
        const gapD_E = rows[5].y - rows[4].y;

        // C→B(複製)・B(複製)→D はどちらも観測ゼロだが、複製した B の行に隣接するため
        // 16px に圧縮される。
        expect(gapC_Bdup).toBeCloseTo(16, 5);
        expect(gapBdup_D).toBeCloseTo(16, 5);

        // D→E も観測ゼロだが、複製の前後ではないため圧縮しない（最小二乗の結果のまま）。
        // 総延長（A→E）は初期の 15 分に保たれ、C-Bdup・Bdup-D・D-E はどれも
        // 初期値 3 分から同じ倍率でスケールされる（3区間とも観測が無く、正則化項だけで
        // 独立に初期値へ収束するため）ので、以下の関係が成り立つ。
        const px = component.effectiveAxisPxPerMinute();
        const expectedRawSeamPx = (15 * px - gapAB - gapBC) / 3;
        expect(gapD_E).toBeCloseTo(expectedRawSeamPx, 5);
        expect(gapD_E).not.toBeCloseTo(16, 1);
    });
});

describe('TrainDiagramComponent: URL の解釈（time / window）', () => {
    let fixture: ComponentFixture<TrainDiagramComponent>;
    let component: TrainDiagramComponent;
    let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
    let router: {
        navigate: jest.Mock;
        createUrlTree: jest.Mock;
        serializeUrl: jest.Mock;
    };
    let location: { replaceState: jest.Mock };

    beforeEach(async () => {
        paramMap$ = new BehaviorSubject(
            convertToParamMap({
                calendar_id: 'cal-1',
                route_ids: 'route-1',
                time: '0700',
            }),
        );
        router = {
            navigate: jest.fn(),
            // createUrlTree/serializeUrl は本物の Router と同じ役割
            // （matrix params → URL 文字列）を、テストで検証しやすい形で模する。
            createUrlTree: jest.fn(
                (commands: [string, Record<string, string>]) => commands[1],
            ),
            serializeUrl: jest.fn((params: Record<string, string>) => {
                const matrix = Object.entries(params)
                    .map(([key, value]) => `${key}=${value}`)
                    .join(';');
                return `/train-diagram;${matrix}`;
            }),
        };
        location = { replaceState: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [TrainDiagramComponent],
            providers: [
                { provide: Router, useValue: router },
                { provide: Location, useValue: location },
                {
                    provide: ActivatedRoute,
                    useValue: { paramMap: paramMap$, snapshot: { params: {} } },
                },
                {
                    provide: TrainDiagramService,
                    useValue: {
                        fetchTripClasses: () => of(undefined),
                        fetchTripBlocks: () => of(undefined),
                        fetchItineraryLinks: () => of(undefined),
                        fetchNetworkStations: () => of(undefined),
                        fetchOperationSightingTimeCrossSection: () =>
                            of(undefined),
                    },
                },
                {
                    provide: TodaysCalendarListStateQuery,
                    useValue: {
                        todaysCalendarId: 'cal-today',
                        todaysCalendarIds$: of(['cal-today']),
                    },
                },
                {
                    provide: RouteStationListStateQuery,
                    useValue: {
                        routeStations$: of([
                            { routeId: 'route-1', routeName: '本線' },
                        ]),
                    },
                },
            ],
        })
            .overrideComponent(TrainDiagramComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TrainDiagramComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        TrainDiagramStore.setCalendarId(null);
        TrainDiagramStore.setSelectedRouteIds([]);
        TrainDiagramStore.setSelectedTripId(null);
        TrainDiagramStore.setTripBlocksByDirection({});
        TrainDiagramStore.setDirectionFilter('both');
        TrainDiagramStore.setPxPerMinute(10);
        TrainDiagramStore.setAxisPxPerMinute(null);
        TrainDiagramStore.setNetworkStations([]);
        TrainDiagramStore.resetLoading();
    });

    it('time だけが変わった URL では選択を解かない', () => {
        TrainDiagramStore.setSelectedTripId('t1');

        paramMap$.next(
            convertToParamMap({
                calendar_id: 'cal-1',
                route_ids: 'route-1',
                time: '0800',
            }),
        );

        expect(TrainDiagramStore.selectedTripId).toBe('t1');
    });

    it('window 付きの古い URL は time に置き換えて replaceUrl する', () => {
        paramMap$.next(
            convertToParamMap({
                calendar_id: 'cal-1',
                route_ids: 'route-1',
                window: '1800-1900',
            }),
        );

        expect(router.navigate).toHaveBeenCalledWith(
            [
                '/train-diagram',
                { calendar_id: 'cal-1', route_ids: 'route-1', time: '1800' },
            ],
            { replaceUrl: true },
        );
    });

    it('I2: window 付きの古い URL は direction を保ったまま time に置き換える', () => {
        paramMap$.next(
            convertToParamMap({
                calendar_id: 'cal-1',
                route_ids: 'route-1',
                direction: 'up',
                window: '1800-1900',
            }),
        );

        expect(router.navigate).toHaveBeenCalledWith(
            [
                '/train-diagram',
                {
                    calendar_id: 'cal-1',
                    route_ids: 'route-1',
                    direction: 'up',
                    time: '1800',
                },
            ],
            { replaceUrl: true },
        );
    });

    it('M2: 不正な time（例: 9999）も正規化の対象になる（`?? 0` に落ちずに defaultStartMinute を使う）', () => {
        paramMap$.next(
            convertToParamMap({
                calendar_id: 'cal-1',
                route_ids: 'route-1',
                time: '9999',
            }),
        );

        expect(router.navigate).toHaveBeenCalledTimes(1);
        const [commands, options] = router.navigate.mock.calls[0];
        expect(commands[0]).toBe('/train-diagram');
        expect(commands[1]).toMatchObject({
            calendar_id: 'cal-1',
            route_ids: 'route-1',
        });
        // parseTimeParam('9999') は undefined なので defaultStartMinute(new Date()) に
        // フォールバックする（`?? 0` で 4:00 に固定されない）。
        expect(commands[1].time).toMatch(/^\d{4}$/);
        expect(commands[1].time).not.toBe('9999');
        expect(options).toEqual({ replaceUrl: true });
    });

    it('I1: onLeftMinuteChange は Location.replaceState のみで Router.navigate を呼ばず、後続の #navigate は最新の time を載せる', () => {
        // 初回ロードの正規化・購読処理を一旦落ち着かせる（初期 URL は正規なので navigate は呼ばれない）。
        router.navigate.mockClear();

        component.onLeftMinuteChange(210); // 4:00 起点で 210 分 = 7:30

        expect(location.replaceState).toHaveBeenCalledTimes(1);
        expect(router.navigate).not.toHaveBeenCalled();

        const url = location.replaceState.mock.calls[0][0];
        expect(url).toContain('time=0730');

        component.onCalendarIdChange('cal-2');

        expect(router.navigate).toHaveBeenCalledWith([
            '/train-diagram',
            expect.objectContaining({ time: '0730', calendar_id: 'cal-2' }),
        ]);
    });

    it('方向・路線の切り替えは Router を通さず、ストアへ反映して URL だけ書き換える。後続の遷移にも載る', () => {
        router.navigate.mockClear();
        location.replaceState.mockClear();
        TrainDiagramStore.setSelectedTripId('t1');

        component.onDirectionFilterChange('up');
        component.onRouteIdsChange(['route-1', 'route-2']);

        expect(router.navigate).not.toHaveBeenCalled();
        expect(TrainDiagramStore.directionFilter).toBe('up');
        expect(TrainDiagramStore.selectedRouteIds).toEqual([
            'route-1',
            'route-2',
        ]);
        expect(TrainDiagramStore.selectedTripId).toBeNull();
        const url = location.replaceState.mock.calls[1][0];
        expect(url).toContain('direction=up');
        expect(url).toContain('route_ids=route-1,route-2');

        component.onCalendarIdChange('cal-2');

        expect(router.navigate).toHaveBeenCalledWith([
            '/train-diagram',
            expect.objectContaining({
                calendar_id: 'cal-2',
                direction: 'up',
                route_ids: 'route-1,route-2',
            }),
        ]);
    });

    it('I3: 該当列車が無い（isEmpty）状態から復帰したら、最新の左端の分（onLeftMinuteChange）へ跳ぶ', () => {
        // fetchData（fire-and-forget）の enableLoading が効いたままだと isLoading()===true で
        // isEmpty() が常に false になるため、ロード完了相当の状態にしておく。
        TrainDiagramStore.resetLoading();

        component.onLeftMinuteChange(300);

        TrainDiagramStore.setTripBlocksByDirection({});
        fixture.detectChanges();
        expect(component.isEmpty()).toBe(true);

        const seqBefore = component.jumpRequest()?.seq ?? 0;

        TrainDiagramStore.setTripBlocksByDirection({
            0: [
                {
                    tripBlockId: 'b1',
                    trips: [{ tripId: 't1' }],
                } as any,
            ],
        });
        fixture.detectChanges();
        expect(component.isEmpty()).toBe(false);

        const jump = component.jumpRequest();
        expect(jump?.minute).toBe(300);
        expect(jump?.align).toBe('start');
        expect(jump?.seq).toBeGreaterThan(seqBefore);
    });

    it('ダイヤを替える取得（骨組みに戻る）が終わったら、最新の左端の分へ跳ぶ', async () => {
        TrainDiagramStore.setTripBlocksByDirection({
            0: [
                {
                    tripBlockId: 'b1',
                    trips: [{ tripId: 't1' }],
                } as any,
            ],
        });
        fixture.detectChanges();
        // 最初の取得（コンストラクタ）が終わるまで待つ
        for (let i = 0; i < 10; i++) {
            await Promise.resolve();
        }
        fixture.detectChanges();
        expect(component.hasFetchedTrainDiagram()).toBe(true);
        expect(component.isEmpty()).toBe(false);

        component.onLeftMinuteChange(300);
        const seqBefore = component.jumpRequest()?.seq ?? 0;

        // ダイヤを替える取得: 取っている間は骨組み（chart は破棄される）
        const refetch = component.fetchData({ refetchTripBlocks: true });
        fixture.detectChanges();
        await refetch;
        fixture.detectChanges();

        const jump = component.jumpRequest();
        expect(jump?.minute).toBe(300);
        expect(jump?.align).toBe('start');
        expect(jump?.seq).toBeGreaterThan(seqBefore);
    });
});

describe('TrainDiagramComponent のサーバー', () => {
    const fetchTripClasses = jest.fn(() => of(undefined));
    const addCacheTags = jest.fn();

    const setup = async (
        params: Record<string, string>,
        extraProviders: Provider[] = [],
    ) => {
        const router = { navigate: jest.fn() };
        await TestBed.configureTestingModule({
            imports: [TrainDiagramComponent],
            providers: [
                { provide: PLATFORM_ID, useValue: 'server' },
                { provide: Router, useValue: router },
                { provide: Location, useValue: { replaceState: jest.fn() } },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap(params)),
                        snapshot: { params },
                    },
                },
                {
                    provide: TrainDiagramService,
                    useValue: {
                        fetchTripClasses,
                        fetchTripBlocks: () => of(undefined),
                        fetchItineraryLinks: () => of(undefined),
                        fetchNetworkStations: () => of(undefined),
                        fetchOperationSightingTimeCrossSection: () =>
                            of(undefined),
                    },
                },
                {
                    provide: TodaysCalendarListStateQuery,
                    useValue: {
                        todaysCalendarId: 'cal-today',
                        todaysCalendarIds$: of(['cal-today']),
                    },
                },
                {
                    provide: RouteStationListStateQuery,
                    useValue: {
                        routeStations$: of([
                            { routeId: 'route-1', routeName: '本線' },
                        ]),
                    },
                },
                ...extraProviders,
            ],
        })
            .overrideComponent(TrainDiagramComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
        return router;
    };

    afterEach(() => {
        jest.clearAllMocks();
        TrainDiagramStore.setCalendarId(null);
        TrainDiagramStore.resetLoading();
    });

    it('サーバーではパラメータの足りない URL を補わず、取りにも行かない', async () => {
        const router = await setup({});

        TestBed.createComponent(TrainDiagramComponent);

        expect(router.navigate).not.toHaveBeenCalled();
        expect(fetchTripClasses).not.toHaveBeenCalled();
    });

    it('サーバーではダイヤのタグを付ける', async () => {
        await setup(
            { calendar_id: 'cal-1', route_ids: 'route-1', time: '0700' },
            [
                {
                    provide: SsrResponse,
                    useValue: { addCacheTags, setCachePolicy: jest.fn() },
                },
            ],
        );

        TestBed.createComponent(TrainDiagramComponent);

        expect(addCacheTags).toHaveBeenCalledWith(['calendar:cal-1']);
    });

    it('サーバーでは今日のダイヤでも「今」の表示を出さない（ブラウザの最初の描画と形をそろえる）', async () => {
        await setup(
            { calendar_id: 'cal-today', route_ids: 'route-1', time: '0700' },
            [
                {
                    provide: SsrResponse,
                    useValue: { addCacheTags, setCachePolicy: jest.fn() },
                },
            ],
        );

        const component = TestBed.createComponent(
            TrainDiagramComponent,
        ).componentInstance;

        expect(component.isTodaySelected()).toBe(true);
        expect(component.showTodayParts()).toBe(false);
        expect(component.nowMinute()).toBeNull();
    });
});

describe('TrainDiagramComponent の圏外の保存', () => {
    let fixture: ComponentFixture<TrainDiagramComponent>;
    let component: TrainDiagramComponent;
    let tripBlocks$: Observable<undefined>;
    // 前後の運用の取得の結果（failed が true なら取得に失敗している）
    let itineraryLinks$: Observable<{ failed: boolean } | undefined>;
    let networkStations$: Observable<undefined>;
    const fetchTripClasses = jest.fn(() => of(undefined));
    const fetchNetworkStations = jest.fn(() => networkStations$);
    const save = jest.fn(() => Promise.resolve());
    const restore = jest.fn();

    const routeStations = [{ routeId: 'route-1', routeName: '本線' }] as never;
    const networkStations = [{ stationId: 'st-1' }] as never;
    const tripClasses = [{ tripClassId: 'tc-1' }] as never;
    const tripBlocksByDirection = { 0: [{ tripBlockId: 'tb-1' }] } as never;
    const itineraryLinks = [{ operationId: 'op-1' }] as never;
    const conditions = { calendarId: 'cal-1', routeIds: 'route-1,route-2' };

    // 実タイマーは使わない（他の describe の Router の失敗が、待っている間に漏れてくるため）
    const flush = async () => {
        for (let i = 0; i < 20; i++) await Promise.resolve();
    };

    beforeEach(async () => {
        tripBlocks$ = of(undefined);
        itineraryLinks$ = of(undefined);
        networkStations$ = of(undefined);
        await TestBed.configureTestingModule({
            imports: [TrainDiagramComponent],
            providers: [
                // 実際の Router だとコンストラクタの補正の navigate が後から失敗して他のテストへ漏れる
                { provide: Router, useValue: { navigate: jest.fn() } },
                { provide: Location, useValue: { replaceState: jest.fn() } },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap({})),
                        snapshot: { params: {} },
                    },
                },
                {
                    provide: TrainDiagramService,
                    useValue: {
                        fetchTripClasses,
                        fetchTripBlocks: () => tripBlocks$,
                        fetchItineraryLinks: () => itineraryLinks$,
                        fetchNetworkStations,
                        fetchOperationSightingTimeCrossSection: () =>
                            of(undefined),
                    },
                },
                {
                    provide: TodaysCalendarListStateQuery,
                    useValue: {
                        todaysCalendarId: 'cal-today',
                        todaysCalendarIds$: of(['cal-today']),
                    },
                },
                {
                    provide: RouteStationListStateQuery,
                    useValue: { routeStations$: of(routeStations) },
                },
                { provide: OfflineSnapshots, useValue: { save, restore } },
            ],
        })
            .overrideComponent(TrainDiagramComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TrainDiagramComponent);
        component = fixture.componentInstance;
        // 条件（順番の違う路線の選択は同じ条件として並べ替えて保存する）
        TrainDiagramStore.setCalendarId('cal-1');
        TrainDiagramStore.setSelectedRouteIds(['route-2', 'route-1']);
    });

    afterEach(() => {
        fixture.destroy();
        jest.clearAllMocks();
        restore.mockReset();
        TrainDiagramStore.setCalendarId(null);
        TrainDiagramStore.setSelectedRouteIds([]);
        TrainDiagramStore.setNetworkStations([]);
        TrainDiagramStore.setTripClasses([]);
        TrainDiagramStore.setTripBlocksByDirection({});
        TrainDiagramStore.setItineraryLinks([]);
        TrainDiagramStore.setRouteStations([]);
        TrainDiagramStore.setHasFetchedTrainDiagram(false);
        TrainDiagramStore.resetLoading();
    });

    it('成功したら条件と中身を保存する', async () => {
        TrainDiagramStore.setNetworkStations(networkStations);
        TrainDiagramStore.setTripClasses(tripClasses);
        TrainDiagramStore.setTripBlocksByDirection(tripBlocksByDirection);
        TrainDiagramStore.setItineraryLinks(itineraryLinks);

        await component.fetchData({ refetchTripBlocks: true });

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
        expect(restore).not.toHaveBeenCalled();
    });

    it('前後の運用の取得だけ失敗したら、保存も戻しもしない（図は出す）', async () => {
        itineraryLinks$ = of({ failed: true });

        await component.fetchData({ refetchTripBlocks: true });

        expect(save).not.toHaveBeenCalled();
        expect(restore).not.toHaveBeenCalled();
        expect(await firstValueFrom(TrainDiagramStore.isLoading$)).toBe(false);
        expect(
            await firstValueFrom(TrainDiagramStore.hasFetchedTrainDiagram$),
        ).toBe(true);
    });

    it('失敗したら保存した中身を、読み込み中を解く前に戻し、失敗は今までどおり投げる', async () => {
        const failing$ = new Subject<undefined>();
        tripBlocks$ = failing$;
        let isLoadingWhenRestored: boolean | undefined;
        restore.mockImplementation(
            (params: { apply: (data: unknown, savedAt: number) => void }) => {
                isLoadingWhenRestored = component.isLoading();
                params.apply(
                    {
                        networkStations,
                        routeStations,
                        tripClasses,
                        tripBlocksByDirection,
                        itineraryLinks,
                    },
                    0,
                );
                return Promise.resolve(null);
            },
        );

        const fetching = component.fetchData({ refetchTripBlocks: true });
        await flush();
        failing$.error(new Error('offline'));
        await expect(fetching).rejects.toThrow('offline');

        expect(save).not.toHaveBeenCalled();
        expect(restore).toHaveBeenCalledWith({
            key: 'TrainDiagram',
            conditions,
            apply: expect.any(Function),
        });
        expect(isLoadingWhenRestored).toBe(true);
        expect(
            await firstValueFrom(TrainDiagramStore.networkStations$),
        ).toEqual(networkStations);
        expect(await firstValueFrom(TrainDiagramStore.tripClasses$)).toEqual(
            tripClasses,
        );
        expect(
            await firstValueFrom(TrainDiagramStore.tripBlocksByDirection$),
        ).toEqual(tripBlocksByDirection);
        expect(await firstValueFrom(TrainDiagramStore.itineraryLinks$)).toEqual(
            itineraryLinks,
        );
        expect(await firstValueFrom(TrainDiagramStore.isLoading$)).toBe(false);
    });

    it('戻した後も初回扱いのまま（次の取得で最初から取り直す）', async () => {
        const failing$ = new Subject<undefined>();
        tripBlocks$ = failing$;
        restore.mockResolvedValue(null);
        const failed = component
            .fetchData({ refetchTripBlocks: true })
            .catch(() => undefined);
        await flush();
        failing$.error(new Error('offline'));
        await failed;
        expect(fetchTripClasses).toHaveBeenCalledTimes(1);

        tripBlocks$ = of(undefined);
        await component.fetchData({ refetchTripBlocks: true });

        expect(fetchTripClasses).toHaveBeenCalledTimes(2);
        expect(fetchNetworkStations).toHaveBeenCalledTimes(2);
    });

    it('片方が先に失敗しても、駅の取得が終わってから戻す', async () => {
        const networkStationsLate = new Subject<undefined>();
        const failing$ = new Subject<undefined>();
        networkStations$ = networkStationsLate;
        tripBlocks$ = failing$;
        restore.mockResolvedValue(null);

        const fetching = component
            .fetchData({ refetchTripBlocks: true })
            .catch(() => undefined);
        await flush();
        failing$.error(new Error('offline'));
        await flush();
        expect(restore).not.toHaveBeenCalled();

        networkStationsLate.next(undefined);
        networkStationsLate.complete();
        await fetching;

        expect(restore).toHaveBeenCalledTimes(1);
        expect(save).not.toHaveBeenCalled();
    });

    it('列車が先に失敗しても、前後の運用の取得が終わってから戻す', async () => {
        const itineraryLinksLate = new Subject<undefined>();
        const failing$ = new Subject<undefined>();
        itineraryLinks$ = itineraryLinksLate;
        tripBlocks$ = failing$;
        restore.mockResolvedValue(null);

        const fetching = component
            .fetchData({ refetchTripBlocks: true })
            .catch(() => undefined);
        await flush();
        failing$.error(new Error('offline'));
        await flush();
        expect(restore).not.toHaveBeenCalled();

        itineraryLinksLate.next(undefined);
        itineraryLinksLate.complete();
        await fetching;

        expect(restore).toHaveBeenCalledTimes(1);
    });

    it('戻す処理が壊れていても、読み込み中は解き、取得の失敗を投げる', async () => {
        const failing$ = new Subject<undefined>();
        tripBlocks$ = failing$;
        restore.mockRejectedValue(new Error('broken snapshot'));

        const fetching = component.fetchData({ refetchTripBlocks: true });
        await flush();
        failing$.error(new Error('offline'));
        await expect(fetching).rejects.toThrow('offline');

        expect(await firstValueFrom(TrainDiagramStore.isLoading$)).toBe(false);
    });

    it('列車を取り直さない取得は、成功しても失敗しても保存も復元もしない', async () => {
        await component.fetchData({ refetchTripBlocks: true });
        save.mockClear();

        await component.fetchData({ refetchTripBlocks: false });
        expect(save).not.toHaveBeenCalled();

        // 列車を取り直さない取得の失敗（初回扱いの駅の取得が失敗する形）
        const another = TestBed.createComponent(TrainDiagramComponent);
        const failing$ = new Subject<undefined>();
        networkStations$ = failing$;
        const fetching = another.componentInstance.fetchData({
            refetchTripBlocks: false,
        });
        await flush();
        failing$.error(new Error('offline'));
        await expect(fetching).rejects.toThrow('offline');
        another.destroy();

        expect(save).not.toHaveBeenCalled();
        expect(restore).not.toHaveBeenCalled();
    });

    it('古い取得が失敗しても、保存した中身は戻さない', async () => {
        const first$ = new Subject<undefined>();
        tripBlocks$ = first$;
        const first = component
            .fetchData({ refetchTripBlocks: true })
            .catch(() => undefined);
        await flush();

        // 取り直しが始まり終わってから、先の取得の失敗が届く
        tripBlocks$ = of(undefined);
        await component.fetchData({ refetchTripBlocks: true });
        first$.error(new Error('offline-first'));
        await first;

        expect(restore).not.toHaveBeenCalled();
    });
});
