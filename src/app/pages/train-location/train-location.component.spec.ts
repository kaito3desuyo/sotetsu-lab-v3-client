import '@testing-library/jest-dom';
import { NO_ERRORS_SCHEMA, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActivatedRoute,
    Router,
    convertToParamMap,
    provideRouter,
    withRouterConfig,
} from '@angular/router';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { PageNotFound } from 'src/app/core/page-not-found/page-not-found';
import { NotificationService } from 'src/app/core/services/notification.service';
import { OperationPostCardService } from 'src/app/shared/operation-post-card/operation-post-card.service';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { setTodaysCalendars } from 'src/app/global-states/testing/set-todays-calendars';
import { formatJst } from 'src/app/core/utils/railway-day';
import { TrainLocationComponent } from './train-location.component';
import { TrainLocationService } from './services/train-location.service';
import { TrainLocationStore } from './stores/train-location.store';

const LEGACY_ROUTE = '99999999-9999-4999-8999-999999999991';
const LEGACY_STATION = '99999999-9999-4999-8999-999999999992';
const LEGACY_STATION_2 = '99999999-9999-4999-8999-999999999993';

describe('TrainLocationComponent', () => {
    let component: TrainLocationComponent;
    let fixture: ComponentFixture<TrainLocationComponent>;
    let store: InstanceType<typeof TrainLocationStore>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainLocationComponent],
            providers: [
                provideRouter(
                    [],
                    withRouterConfig({ resolveNavigationPromiseOnError: true }),
                ),
                {
                    provide: TrainLocationService,
                    useValue: {
                        fetchTripClasses: () => of(undefined),
                        fetchTripBlocks: () => of(undefined),
                        fetchItineraryLinks: () => of(undefined),
                        fetchStationAxis: () => of(undefined),
                        fetchMissingOperationSightingTimeCrossSections: () =>
                            of(undefined),
                    },
                },
                {
                    provide: RouteStationListState,
                    useValue: {
                        routeStations: signal([
                            { routeId: 'route-1', routeName: '本線' },
                        ]),
                        operatingSystemEndsByRouteId: signal({}),
                    },
                },
            ],
        })
            .overrideComponent(TrainLocationComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
        setTodaysCalendars(['cal-today']);

        store = TestBed.inject(TrainLocationStore);
        fixture = TestBed.createComponent(TrainLocationComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('route_id が無い初期状態では route_id 付き URL へリダイレクトを試みる（例外を投げない）', () => {
        // provideRouter([]) にはマッチするルートが無いため実際の遷移は完了しないが、
        // redirect 呼び出し自体が同期的に例外を投げないことだけを確認する
        // （store 反映は redirect 完了後の再購読で行われるため、ここでは検証しない）
        expect(component).toBeTruthy();
    });

    it('onModeChange: 例外を投げない', () => {
        expect(() => component.onModeChange('specified')).not.toThrow();
    });

    it('onRouteIdChange: 例外を投げない', () => {
        expect(() => component.onRouteIdChange('route-2')).not.toThrow();
    });

    it('onCalendarIdChange: mode="now" のときは無視される（no-op）', () => {
        store.setMode('now');
        expect(() => component.onCalendarIdChange('cal-2')).not.toThrow();
    });

    it('at(): mode="now" のとき現在時刻ベースの Date を返す', () => {
        const before = Date.now();
        const at = component.at();
        expect(at.getTime()).toBeGreaterThanOrEqual(before - 1000);
    });

    it('at(): mode="specified" かつ specifiedTime があればその時刻を反映する', () => {
        store.setMode('specified');
        store.setSpecifiedTime('0730');
        fixture.detectChanges();

        const at = component.at();
        expect(formatJst(at, 'HH:mm')).toBe('07:30');
    });

    it('rows(): 初期状態（データ無し）でも例外を投げない', () => {
        expect(() => component.rows()).not.toThrow();
    });

    it('免責文（R-7 短縮版）をページ最下部に常設表示する（ロード状態に依存しない）', () => {
        // 通常時
        fixture.detectChanges();
        const footer: HTMLElement =
            fixture.nativeElement.querySelector('footer');
        expect(footer).toBeTruthy();
        expect(footer).toHaveTextContent(/ダイヤ通りに走った場合の位置です/);
        expect(footer).toHaveTextContent(/リアルタイム運用情報/);

        // ロード中も消えない（常設）
        store.enableLoading();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('footer')).toBeTruthy();
        store.disableLoading();
    });

    it('取る前は骨組みを出し、本文は出さない。取得中のプログレスバーはヘッダーの下', () => {
        store.enableLoading();
        store.setHasFetchedTrainLocation(false);
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;
        expect(
            el.querySelector('[data-testid="train-location-skeleton"]'),
        ).not.toBeNull();
        expect(el.querySelector('app-train-location-line')).toBeNull();
        expect(el.querySelector('app-empty-state')).toBeNull();
        expect(el.querySelector('app-loading')).toBeNull();
        const bar = el.querySelector('mat-progress-bar');
        expect(bar?.getAttribute('color')).toBe('accent');
        // 運用表と同じ位置（ヘッダーのすぐ下）
        expect(bar?.parentElement?.className).toContain('tw-top-[48px]');
        expect(bar?.parentElement?.className).toContain('md:tw-top-[64px]');

        store.disableLoading();
        store.setHasFetchedTrainLocation(true);
        fixture.detectChanges();

        expect(
            el.querySelector('[data-testid="train-location-skeleton"]'),
        ).toBeNull();
        expect(el.querySelector('app-train-location-line')).toBeTruthy();
        expect(el.querySelector('mat-progress-bar')).toBeNull();
    });

    it('G12: 在線列車が0本のとき、駅ラインを残したまま空文脈メッセージを重ねて表示する', () => {
        // ロード完了・在線列車なし（tripBlocks 空 = positions 0）の状態。
        store.disableLoading();
        store.setHasFetchedTrainLocation(true);
        fixture.detectChanges();

        expect(component.hasNoTrainsInService()).toBe(true);
        // 駅ライン（方位を示す有用コンテンツ）は消えず残る（情報削減禁止）
        expect(
            fixture.nativeElement.querySelector('app-train-location-line'),
        ).toBeTruthy();
        // 空文脈メッセージ（app-empty-state）が重ねて表示される
        expect(
            fixture.nativeElement.querySelector('app-empty-state'),
        ).toBeTruthy();
    });

    it('fetchData: フェッチが reject しても isLoading が回復する（try/finally）', async () => {
        const service = TestBed.inject(TrainLocationService) as {
            fetchTripBlocks: () => unknown;
        };
        service.fetchTripBlocks = () =>
            throwError(() => new Error('fetch failed'));

        await expect(
            component.fetchData({
                refetchTripBlocks: true,
                refetchStationAxis: false,
            }),
        ).rejects.toThrow('fetch failed');

        expect(store.isLoading()).toBe(false);
        // 失敗しても骨組みを消す
        expect(store.hasFetchedTrainLocation()).toBe(true);
    });

    it('免責文はページ下端の 1 か所だけ', () => {
        fixture.detectChanges();
        const text = fixture.nativeElement.textContent as string;
        expect(text.split('ダイヤ通りに走った場合の位置です').length - 1).toBe(
            1,
        );
    });

    it('時計は表示設定（操作部）の 2 行目に渡し、ページには時計の行を持たない', () => {
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('app-train-location-clock')).toBeNull();
        expect(el.querySelector('[data-clock]')).toBeNull();
        const controller = el.querySelector(
            'app-train-location-controller',
        ) as unknown as {
            clockText: string;
        };
        expect(controller.clockText).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('時計と指定時刻への切り替えは、端末の時差によらず日本時間で出す', () => {
        jest.useFakeTimers({ now: new Date('2026-11-13T01:30:00Z') });
        try {
            fixture = TestBed.createComponent(TrainLocationComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
            const controller = (
                fixture.nativeElement as HTMLElement
            ).querySelector('app-train-location-controller') as unknown as {
                clockText: string;
            };
            expect(controller.clockText).toMatch(/^10:30:\d{2}$/);

            const router = TestBed.inject(Router);
            const navigate = jest
                .spyOn(router, 'navigate')
                .mockResolvedValue(true);
            component.onModeChange('specified');

            expect(navigate).toHaveBeenCalledWith([
                '/train-location',
                expect.objectContaining({ time: '1030' }),
            ]);
        } finally {
            jest.useRealTimers();
        }
    });

    it('onStationSelect: 駅を URL に載せ、路線ごとに覚える', () => {
        const router = TestBed.inject(Router);
        const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
        store.setSelectedRouteId('r1');

        component.onStationSelect('s1');

        expect(navigate).toHaveBeenCalledWith([
            '/train-location',
            expect.objectContaining({ station_id: 's1' }),
        ]);
        expect(localStorage.getItem('train-location:station:r1')).toBe('s1');
    });

    it('onRouteIdChange: 駅の選択を外して路線を変える', () => {
        const router = TestBed.inject(Router);
        const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);

        component.onRouteIdChange('r2');

        const params = navigate.mock.calls[0][0][1] as Record<string, string>;
        expect(params['route_id']).toBe('r2');
        expect(params['station_id']).toBeUndefined();
    });

    it('selectedStationId(): 駅軸に無い id のときは null を返す（路線を変えた直後など）', () => {
        store.setStationAxisStations([
            { stationId: 'a', stationName: '駅A' } as never,
        ]);
        store.setSelectedStationId('zzz');
        fixture.detectChanges();

        expect(component.selectedStationId()).toBeNull();
    });

    describe('paramMap のリダイレクト', () => {
        async function setupWithParamMap(
            params: Record<string, string>,
        ): Promise<{ router: Router }> {
            TestBed.resetTestingModule();
            await TestBed.configureTestingModule({
                imports: [TrainLocationComponent],
                providers: [
                    provideRouter(
                        [],
                        withRouterConfig({
                            resolveNavigationPromiseOnError: true,
                        }),
                    ),
                    {
                        provide: ActivatedRoute,
                        useValue: {
                            paramMap: of(convertToParamMap(params)),
                            snapshot: { params },
                        },
                    },
                    {
                        provide: TrainLocationService,
                        useValue: {
                            fetchTripClasses: () => of(undefined),
                            fetchTripBlocks: () => of(undefined),
                            fetchItineraryLinks: () => of(undefined),
                            fetchStationAxis: () => of(undefined),
                            fetchMissingOperationSightingTimeCrossSections:
                                () => of(undefined),
                        },
                    },
                    {
                        provide: RouteStationListState,
                        useValue: {
                            routeStations: signal([
                                { routeId: LEGACY_ROUTE, routeName: '本線' },
                            ]),
                            operatingSystemEndsByRouteId: signal({}),
                        },
                    },
                ],
            })
                .overrideComponent(TrainLocationComponent, {
                    set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
                })
                .compileComponents();
            setTodaysCalendars(['cal-today']);

            const router = TestBed.inject(Router);
            return { router };
        }

        afterEach(() => {
            localStorage.removeItem(`train-location:station:${LEGACY_ROUTE}`);
            // 次のテスト（beforeEach）が通常構成に戻れるよう、直後に元の TestBed 構成へ戻す。
        });

        it('駅の覚え書きがあり station_id 未指定なら、覚えている駅付きの URL へ replaceUrl で飛ばす', async () => {
            localStorage.setItem(
                `train-location:station:${LEGACY_ROUTE}`,
                LEGACY_STATION,
            );
            const { router } = await setupWithParamMap({
                route_id: LEGACY_ROUTE,
            });
            const navigate = jest
                .spyOn(router, 'navigate')
                .mockResolvedValue(true);

            TestBed.createComponent(TrainLocationComponent);

            expect(navigate).toHaveBeenCalledWith(
                [
                    '/train-location',
                    expect.objectContaining({
                        route_id: LEGACY_ROUTE,
                        station_id: LEGACY_STATION,
                    }),
                ],
                { replaceUrl: true },
            );
        });

        it('paramMap に station_id があるときはリダイレクトしない', async () => {
            localStorage.setItem(
                `train-location:station:${LEGACY_ROUTE}`,
                LEGACY_STATION,
            );
            const { router } = await setupWithParamMap({
                route_id: LEGACY_ROUTE,
                station_id: LEGACY_STATION_2,
            });
            const navigate = jest
                .spyOn(router, 'navigate')
                .mockResolvedValue(true);

            TestBed.createComponent(TrainLocationComponent);

            expect(navigate).not.toHaveBeenCalled();
        });
    });

    it('入ったときは前の訪問の「取り終えた」を引き継がない', () => {
        store.setHasFetchedTrainLocation(true);
        fixture = TestBed.createComponent(TrainLocationComponent);
        fixture.detectChanges();

        expect(
            (fixture.nativeElement as HTMLElement).querySelector(
                '[data-testid="train-location-skeleton"]',
            ),
        ).not.toBeNull();
    });

    it('路線を変えて取り直すときは骨組みに戻す', async () => {
        await component.fetchData({
            refetchTripBlocks: true,
            refetchStationAxis: true,
        });
        fixture.detectChanges();
        const service = TestBed.inject(TrainLocationService) as {
            fetchStationAxis: () => unknown;
        };
        service.fetchStationAxis = () => new Subject<undefined>();

        component
            .fetchData({ refetchTripBlocks: false, refetchStationAxis: true })
            .catch(() => undefined);
        fixture.detectChanges();

        expect(
            (fixture.nativeElement as HTMLElement).querySelector(
                '[data-testid="train-location-skeleton"]',
            ),
        ).not.toBeNull();
    });
});

describe('TrainLocationComponent の再訪', () => {
    let fixture: ComponentFixture<TrainLocationComponent>;
    let tripBlocks$: Subject<undefined>;
    let store: InstanceType<typeof TrainLocationStore>;

    // 先のテストが残す未処理の遷移の失敗を、これらのテストの待ちで表に出さないよう、マクロタスクは挟まず
    // マイクロタスクだけを回す
    const flush = async () => {
        for (let i = 0; i < 20; i++) {
            await Promise.resolve();
        }
    };
    const skeleton = () =>
        (fixture.nativeElement as HTMLElement).querySelector(
            '[data-testid="train-location-skeleton"]',
        );

    beforeEach(async () => {
        tripBlocks$ = new Subject<undefined>();
        const params = { route_id: LEGACY_ROUTE, station_id: LEGACY_STATION };
        await TestBed.configureTestingModule({
            imports: [TrainLocationComponent],
            providers: [
                provideRouter(
                    [],
                    withRouterConfig({ resolveNavigationPromiseOnError: true }),
                ),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap(params)),
                        snapshot: { params },
                    },
                },
                {
                    provide: TrainLocationService,
                    useValue: {
                        fetchTripClasses: () => of(undefined),
                        fetchTripBlocks: () => tripBlocks$,
                        fetchItineraryLinks: () => of(undefined),
                        fetchStationAxis: () => of(undefined),
                        fetchMissingOperationSightingTimeCrossSections: () =>
                            of(undefined),
                    },
                },
                {
                    provide: RouteStationListState,
                    useValue: {
                        routeStations: signal([
                            { routeId: LEGACY_ROUTE, routeName: '本線' },
                        ]),
                        operatingSystemEndsByRouteId: signal({}),
                    },
                },
            ],
        })
            .overrideComponent(TrainLocationComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
        setTodaysCalendars(['cal-today']);
        store = TestBed.inject(TrainLocationStore);
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('ページを離れてすぐ戻ったとき、前のインスタンスの取得が後から終わっても、新しい取得が終わるまで骨組みは消えない', async () => {
        fixture = TestBed.createComponent(TrainLocationComponent);
        fixture.detectChanges();
        // 種別の取得を待ってから trip-blocks を取り始めるので、取り始めるのを待ってから離れる
        await flush();
        const previousTripBlocks$ = tripBlocks$;
        fixture.destroy();
        tripBlocks$ = new Subject<undefined>();
        fixture = TestBed.createComponent(TrainLocationComponent);
        fixture.detectChanges();

        previousTripBlocks$.next(undefined);
        previousTripBlocks$.complete();
        await flush();
        fixture.detectChanges();
        expect(skeleton()).not.toBeNull();

        tripBlocks$.next(undefined);
        tripBlocks$.complete();
        await flush();
        fixture.detectChanges();
        expect(skeleton()).toBeNull();
    });

    it('取り終えた後、時計が進んでも、目撃の取り足しが走っても、骨組みには戻らない', async () => {
        jest.useFakeTimers({ now: new Date('2026-10-22T09:10:00+09:00') });
        try {
            const missingSightings = jest.fn(() => of(undefined));
            const service = TestBed.inject(TrainLocationService) as {
                fetchMissingOperationSightingTimeCrossSections: unknown;
            };
            service.fetchMissingOperationSightingTimeCrossSections =
                missingSightings;

            fixture = TestBed.createComponent(TrainLocationComponent);
            fixture.detectChanges();
            await flush();
            tripBlocks$.next(undefined);
            tripBlocks$.complete();
            await flush();
            fixture.detectChanges();
            expect(skeleton()).toBeNull();

            // 9:10 に駅 a から駅 b へ走っている今日の列車を在線させる（取り足しの対象になる）
            store.setStationAxisStations([
                { stationId: 'a' },
                { stationId: 'b' },
            ] as never);
            store.setTripBlocksByDirection({
                0: [
                    {
                        trips: [
                            {
                                tripId: 't1',
                                times: [
                                    {
                                        stationId: 'a',
                                        departureTime: '09:00:00',
                                        stopSequence: 1,
                                    },
                                    {
                                        stationId: 'b',
                                        arrivalTime: '09:30:00',
                                        stopSequence: 2,
                                    },
                                ],
                                tripOperationLists: [
                                    { operation: { operationNumber: '11' } },
                                ],
                            },
                        ],
                    },
                ],
            } as never);
            fixture.detectChanges();
            expect(missingSightings).toHaveBeenCalledWith(['11']);
            expect(skeleton()).toBeNull();

            const before = fixture.componentInstance.at().getTime();
            jest.advanceTimersByTime(30_000);
            fixture.detectChanges();

            expect(fixture.componentInstance.at().getTime()).toBeGreaterThan(
                before,
            );
            expect(skeleton()).toBeNull();
        } finally {
            jest.useRealTimers();
        }
    });
});

describe('TrainLocationComponent をサーバーで描くとき', () => {
    it('URL を補わず、中身を取らず、引き継がない', async () => {
        const fetchTripBlocks = jest.fn(() => of(undefined));
        await TestBed.configureTestingModule({
            imports: [TrainLocationComponent],
            providers: [
                provideRouter(
                    [],
                    withRouterConfig({ resolveNavigationPromiseOnError: true }),
                ),
                { provide: PLATFORM_ID, useValue: 'server' },
                {
                    provide: TrainLocationService,
                    useValue: {
                        fetchTripClasses: () => of(undefined),
                        fetchTripBlocks,
                        fetchItineraryLinks: () => of(undefined),
                        fetchStationAxis: () => of(undefined),
                        fetchMissingOperationSightingTimeCrossSections: () =>
                            of(undefined),
                    },
                },
                {
                    provide: RouteStationListState,
                    useValue: {
                        routeStations: signal([
                            { routeId: 'route-1', routeName: '本線' },
                        ]),
                        operatingSystemEndsByRouteId: signal({}),
                    },
                },
            ],
        })
            .overrideComponent(TrainLocationComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
        setTodaysCalendars([]);

        const navigate = jest.spyOn(TestBed.inject(Router), 'navigate');
        const fixture = TestBed.createComponent(TrainLocationComponent);
        fixture.detectChanges();

        expect(navigate).not.toHaveBeenCalled();
        expect(fetchTripBlocks).not.toHaveBeenCalled();
        expect(fixture.nativeElement).toHaveAttribute('ngskiphydration');
    });
});

describe('TrainLocationComponent をサーバーで描くとき（URL の値が不正）', () => {
    it('ブラウザと同じく見つからない表示にして 404 にし、中身を取らない', async () => {
        const mark = jest.fn();
        const fetchTripBlocks = jest.fn(() => of(undefined));
        const params = { route_id: 'r1' };
        await TestBed.configureTestingModule({
            imports: [TrainLocationComponent],
            providers: [
                provideRouter([]),
                { provide: PLATFORM_ID, useValue: 'server' },
                { provide: PageNotFound, useValue: { mark } },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap(params)),
                        snapshot: { params },
                    },
                },
                {
                    provide: TrainLocationService,
                    useValue: { fetchTripBlocks },
                },
                {
                    provide: RouteStationListState,
                    useValue: {
                        routeStations: signal([]),
                        operatingSystemEndsByRouteId: signal({}),
                    },
                },
            ],
        })
            .overrideComponent(TrainLocationComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
        setTodaysCalendars([]);

        const fixture = TestBed.createComponent(TrainLocationComponent);
        fixture.detectChanges();

        expect(mark).toHaveBeenCalledTimes(1);
        expect(fetchTripBlocks).not.toHaveBeenCalled();
        expect(
            (fixture.nativeElement as HTMLElement).querySelector(
                'app-not-found-content',
            ),
        ).not.toBeNull();
    });
});

describe('TrainLocationComponent の投稿後の取り直し', () => {
    const open = jest.fn();
    const fetchTripBlocks = jest.fn(() => of(undefined));
    const fetchMissing = jest.fn(() => of(false));
    const refetch = jest.fn<Observable<undefined>, [readonly string[]]>(() =>
        of(undefined),
    );
    let fixture: ComponentFixture<TrainLocationComponent>;

    const flush = async () => {
        for (let i = 0; i < 20; i++) {
            await Promise.resolve();
        }
    };

    // 9:10 に駅 a から駅 b へ走っている列車（運用 11）を在線させる
    const putRunningTrip = () => {
        const store = TestBed.inject(TrainLocationStore);
        store.setStationAxisStations([
            { stationId: 'a' },
            { stationId: 'b' },
        ] as never);
        store.setTripBlocksByDirection({
            0: [
                {
                    trips: [
                        {
                            tripId: 't1',
                            times: [
                                {
                                    stationId: 'a',
                                    departureTime: '09:00:00',
                                    stopSequence: 1,
                                },
                                {
                                    stationId: 'b',
                                    arrivalTime: '09:30:00',
                                    stopSequence: 2,
                                },
                            ],
                            tripOperationLists: [
                                { operation: { operationNumber: '11' } },
                            ],
                        },
                    ],
                },
            ],
        } as never);
        fixture.detectChanges();
    };

    const setup = async (todayIds: string[]) => {
        const params = { route_id: LEGACY_ROUTE, station_id: LEGACY_STATION };
        await TestBed.configureTestingModule({
            imports: [TrainLocationComponent],
            providers: [
                provideRouter(
                    [],
                    withRouterConfig({ resolveNavigationPromiseOnError: true }),
                ),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap(params)),
                        snapshot: { params },
                    },
                },
                {
                    provide: TrainLocationService,
                    useValue: {
                        fetchTripClasses: () => of(undefined),
                        fetchTripBlocks,
                        fetchItineraryLinks: () => of(undefined),
                        fetchStationAxis: () => of(undefined),
                        fetchMissingOperationSightingTimeCrossSections:
                            fetchMissing,
                        fetchOperationSightingTimeCrossSections: refetch,
                    },
                },
                {
                    provide: RouteStationListState,
                    useValue: {
                        routeStations: signal([
                            { routeId: LEGACY_ROUTE, routeName: '本線' },
                        ]),
                        operatingSystemEndsByRouteId: signal({}),
                    },
                },
                { provide: NotificationService, useValue: { open } },
                {
                    provide: OfflineSnapshots,
                    useValue: { save: jest.fn(), restore: jest.fn() },
                },
            ],
        })
            .overrideComponent(TrainLocationComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
        setTodaysCalendars(todayIds);
        fixture = TestBed.createComponent(TrainLocationComponent);
        fixture.detectChanges();
        await flush();
        putRunningTrip();
        await flush();
        // 作ったときと在線させたときの取得を数えないようにする
        jest.clearAllMocks();
    };

    beforeEach(() => {
        jest.useFakeTimers({
            now: new Date('2026-10-22T09:10:00+09:00'),
            doNotFake: ['queueMicrotask', 'nextTick'],
        });
    });

    afterEach(() => {
        jest.useRealTimers();
        fixture.destroy();
        jest.clearAllMocks();
        refetch.mockImplementation(() => of(undefined));
        TestBed.inject(TrainLocationStore).resetLoading();
    });

    it('投稿されたら、いま動いている列車の運用の目撃を取り直し、列車は取り直さない', async () => {
        await setup(['cal-today']);

        TestBed.inject(OperationPostCardService).emitSubmitEvent();
        await flush();

        expect(refetch).toHaveBeenCalledTimes(1);
        expect(refetch).toHaveBeenCalledWith(['11']);
        expect(fetchTripBlocks).not.toHaveBeenCalled();
        expect(open).not.toHaveBeenCalled();
    });

    it('今日のダイヤでなければ何も取らない', async () => {
        await setup([]);

        TestBed.inject(OperationPostCardService).emitSubmitEvent();
        await flush();

        expect(refetch).not.toHaveBeenCalled();
        expect(fetchTripBlocks).not.toHaveBeenCalled();
    });

    it('取得に失敗したら通知を出し、投げない', async () => {
        await setup(['cal-today']);
        const consoleError = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        refetch.mockImplementation(() =>
            throwError(() => new Error('offline')),
        );

        TestBed.inject(OperationPostCardService).emitSubmitEvent();
        await flush();

        expect(open).toHaveBeenCalledWith('データの取得に失敗しました', 'OK');
        expect(TestBed.inject(TrainLocationStore).isLoading()).toBe(false);
        consoleError.mockRestore();
    });
});

describe('TrainLocationComponent の URL の値が不正なとき', () => {
    const ROUTE_1 = '11111111-1111-4111-8111-111111111111';
    const ROUTE_2 = '22222222-2222-4222-8222-222222222222';
    const ST_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
    const ST_2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
    const ST_3 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
    const CAL_1 = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
    const CAL_2 = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2';
    const CAL_TODAY = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc0';
    const UNKNOWN = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

    const mark = jest.fn();
    const fetchTripClasses = jest.fn();
    const fetchTripBlocks = jest.fn();
    const fetchItineraryLinks = jest.fn();
    const fetchStationAxis = jest.fn();
    const fetchCalendar = jest.fn();
    const save = jest.fn(() => Promise.resolve());
    const routeStations = signal<
        {
            routeId: string;
            routeName: string;
            routeStationLists: { station: { stationId: string } }[];
        }[]
    >([]);
    let params$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
    let navigate: jest.SpyInstance;

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const calls = () => [
        fetchTripClasses,
        fetchTripBlocks,
        fetchItineraryLinks,
        fetchStationAxis,
        fetchCalendar,
    ];
    const valid = {
        route_id: ROUTE_1,
        station_id: ST_1,
        time: '0700',
        calendar_id: CAL_1,
    };

    async function create(
        params: Record<string, string>,
    ): Promise<ComponentFixture<TrainLocationComponent>> {
        params$ = new BehaviorSubject(convertToParamMap(params));
        await TestBed.configureTestingModule({
            imports: [TrainLocationComponent],
            providers: [
                provideRouter(
                    [],
                    withRouterConfig({ resolveNavigationPromiseOnError: true }),
                ),
                {
                    provide: ActivatedRoute,
                    useValue: { paramMap: params$, snapshot: { params } },
                },
                { provide: PageNotFound, useValue: { mark } },
                {
                    provide: TrainLocationService,
                    useValue: {
                        fetchTripClasses,
                        fetchTripBlocks,
                        fetchItineraryLinks,
                        fetchStationAxis,
                        fetchCalendar,
                        fetchMissingOperationSightingTimeCrossSections: () =>
                            of(false),
                    },
                },
                {
                    provide: RouteStationListState,
                    useValue: {
                        routeStations,
                        operatingSystemEndsByRouteId: signal({}),
                    },
                },
                { provide: NotificationService, useValue: { open: jest.fn() } },
                {
                    provide: OfflineSnapshots,
                    useValue: { save, restore: jest.fn() },
                },
            ],
        })
            .overrideComponent(TrainLocationComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
        setTodaysCalendars([CAL_TODAY]);
        navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
        const fixture = TestBed.createComponent(TrainLocationComponent);
        fixture.detectChanges();
        await flush();
        fixture.detectChanges();
        return fixture;
    }

    const has = (f: ComponentFixture<unknown>, selector: string) =>
        f.nativeElement.querySelector(selector) !== null;
    const hasNotFound = (f: ComponentFixture<unknown>) =>
        has(f, 'app-not-found-content');
    const hasBand = (f: ComponentFixture<unknown>) =>
        has(f, 'app-control-band');
    const hasBody = (f: ComponentFixture<unknown>) =>
        has(f, 'app-train-location-station-panel');

    beforeEach(() => {
        localStorage.clear();
        routeStations.set([
            {
                routeId: ROUTE_1,
                routeName: '本線',
                routeStationLists: [
                    { station: { stationId: ST_1 } },
                    { station: { stationId: ST_2 } },
                ],
            },
            {
                routeId: ROUTE_2,
                routeName: 'いずみ野線',
                routeStationLists: [{ station: { stationId: ST_3 } }],
            },
        ]);
        fetchTripClasses.mockReturnValue(of(undefined));
        fetchTripBlocks.mockReturnValue(of(undefined));
        fetchItineraryLinks.mockReturnValue(of({ failed: false }));
        fetchStationAxis.mockReturnValue(of(undefined));
        fetchCalendar.mockReturnValue(of(true));
    });
    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
        localStorage.clear();
    });

    it.each([
        ['route_id', 'undefined'],
        ['route_id', 'r1'],
        ['station_id', 's1'],
        ['station_id', 'undefined'],
        ['time', 'abc'],
        ['time', '9999'],
        ['time', '0760'],
        ['calendar_id', 'undefined'],
        ['calendar_id', 'cal-1'],
    ])(
        '%s=%s は見つからない表示にして、補いも取得もしない',
        async (key, value) => {
            const fixture = await create({ ...valid, [key]: value });

            expect(mark).toHaveBeenCalledTimes(1);
            for (const call of calls()) expect(call).not.toHaveBeenCalled();
            expect(navigate).not.toHaveBeenCalled();
            expect(hasNotFound(fixture)).toBe(true);
            expect(hasBody(fixture)).toBe(false);
            expect(hasBand(fixture)).toBe(true);
        },
    );

    it('time が無くても、calendar_id が不正なら見つからない表示にする', async () => {
        const { time, ...rest } = valid;
        void time;
        const fixture = await create({ ...rest, calendar_id: 'cal-1' });

        expect(mark).toHaveBeenCalledTimes(1);
        for (const call of calls()) expect(call).not.toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(true);
    });

    it('路線の一覧に無い route_id は見つからない表示にして、取得しない', async () => {
        const fixture = await create({ ...valid, route_id: UNKNOWN });

        expect(mark).toHaveBeenCalledTimes(1);
        for (const call of calls()) expect(call).not.toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(true);
    });

    it('路線の駅でない station_id は見つからない表示にして、取得しない', async () => {
        const fixture = await create({ ...valid, station_id: ST_3 });

        expect(mark).toHaveBeenCalledTimes(1);
        for (const call of calls()) expect(call).not.toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(true);
    });

    it('路線の一覧が空のときは、route_id の存在を確かめず取得する', async () => {
        routeStations.set([]);
        const fixture = await create({ ...valid, route_id: UNKNOWN });

        expect(mark).not.toHaveBeenCalled();
        expect(fetchTripBlocks).toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(false);
    });

    it('路線の駅の一覧が空のときは、station_id の所属を確かめず取得する', async () => {
        routeStations.set([
            { routeId: ROUTE_1, routeName: '本線', routeStationLists: [] },
        ]);
        const fixture = await create({ ...valid, station_id: ST_3 });

        expect(mark).not.toHaveBeenCalled();
        expect(fetchTripBlocks).toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(false);
    });

    it('正しい URL は取得し、見つからない表示にしない（ダイヤの存在も 1 本で確かめる）', async () => {
        const fixture = await create(valid);

        expect(mark).not.toHaveBeenCalled();
        expect(fetchCalendar).toHaveBeenCalledTimes(1);
        expect(fetchTripBlocks).toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(false);
        expect(hasBody(fixture)).toBe(true);
    });

    it('現在時刻モード（今日のダイヤ）では、ダイヤの存在を確かめない', async () => {
        await create({ route_id: ROUTE_1, station_id: ST_1 });

        expect(fetchTripBlocks).toHaveBeenCalled();
        expect(fetchCalendar).not.toHaveBeenCalled();
    });

    it('route_id が無い URL は今までどおり先頭の路線で補う', async () => {
        const fixture = await create({});

        expect(mark).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledTimes(1);
        expect(navigate.mock.calls[0][0][1]).toEqual(
            expect.objectContaining({ route_id: ROUTE_1 }),
        );
        expect(navigate.mock.calls[0][1]).toEqual({ replaceUrl: true });
        expect(hasNotFound(fixture)).toBe(false);
    });

    it('station_id が無い URL は、覚えている駅で補う', async () => {
        localStorage.setItem(`train-location:station:${ROUTE_1}`, ST_2);
        const fixture = await create({ route_id: ROUTE_1 });

        expect(mark).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith(
            [
                '/train-location',
                expect.objectContaining({
                    route_id: ROUTE_1,
                    station_id: ST_2,
                }),
            ],
            { replaceUrl: true },
        );
        expect(hasNotFound(fixture)).toBe(false);
    });

    it('覚えている駅が路線に無いときは、補わないだけで見つからない表示にしない', async () => {
        localStorage.setItem(`train-location:station:${ROUTE_1}`, ST_3);
        const fixture = await create({ route_id: ROUTE_1 });

        expect(mark).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
        expect(fetchTripBlocks).toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(false);
    });

    it.each([
        ['route_id が空', { route_id: '' }],
        ['station_id が空', { station_id: '' }],
        ['time が空', { time: '' }],
        ['calendar_id が空', { calendar_id: '' }],
    ])(
        '値が空（%s）は、無いものとして今までどおり補い、見つからない表示にしない',
        async (_name, extra) => {
            const fixture = await create({ ...valid, ...extra });

            expect(mark).not.toHaveBeenCalled();
            expect(hasNotFound(fixture)).toBe(false);
        },
    );

    it('見つからない URL でも、ストアの選択は消さない', async () => {
        await create(valid);
        const store = TestBed.inject(TrainLocationStore);
        store.setSelectedRouteId(ROUTE_2);
        store.setSelectedStationId(ST_3);
        store.setCalendarId(CAL_2);

        params$.next(convertToParamMap({ ...valid, time: '9999' }));
        await flush();

        expect(store.selectedRouteId()).toBe(ROUTE_2);
        expect(store.selectedStationId()).toBe(ST_3);
        expect(store.calendarId()).toBe(CAL_2);
    });

    it('存在しないダイヤ（api が null を返す）は、取得のあとで見つからない表示にする', async () => {
        fetchCalendar.mockReturnValue(of(false));
        const fixture = await create(valid);

        expect(fetchCalendar).toHaveBeenCalled();
        expect(mark).toHaveBeenCalledTimes(1);
        expect(hasNotFound(fixture)).toBe(true);
        expect(hasBody(fixture)).toBe(false);
        expect(hasBand(fixture)).toBe(true);
        expect(TestBed.inject(TrainLocationStore).isLoading()).toBe(false);
    });

    it('ダイヤが無いと分かったときは、圏外用の保存をしない', async () => {
        fetchCalendar.mockReturnValue(of(false));
        await create(valid);

        expect(save).not.toHaveBeenCalled();
    });

    it('ダイヤの確認の失敗（5xx・通信の失敗）は見つからない表示にしない', async () => {
        fetchCalendar.mockReturnValue(throwError(() => new Error('500')));
        const fixture = await create(valid);

        expect(mark).not.toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(false);
        expect(hasBody(fixture)).toBe(true);
    });

    it('列車の取得の失敗は見つからない表示にせず、今までの失敗のまま', async () => {
        fetchTripBlocks.mockReturnValue(throwError(() => new Error('500')));
        const original = TrainLocationComponent.prototype.fetchData;
        jest.spyOn(
            TrainLocationComponent.prototype,
            'fetchData',
        ).mockImplementation(function (this: TrainLocationComponent, flags) {
            return original.call(this, flags).catch(() => undefined);
        });
        const fixture = await create(valid);

        expect(mark).not.toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(false);
        expect(TestBed.inject(TrainLocationStore).isLoading()).toBe(false);
    });

    it('見つからない表示から正しい URL へ移ると、本体に戻って取得する', async () => {
        const fixture = await create({ ...valid, time: '9999' });
        expect(hasNotFound(fixture)).toBe(true);

        params$.next(convertToParamMap(valid));
        await flush();
        fixture.detectChanges();

        expect(hasNotFound(fixture)).toBe(false);
        expect(hasBody(fixture)).toBe(true);
        expect(fetchTripBlocks).toHaveBeenCalled();
    });

    it('存在しないダイヤから、同じ URL へ戻ると、取り直して見つからない表示のまま', async () => {
        fetchCalendar.mockReturnValue(of(false));
        const fixture = await create(valid);
        params$.next(convertToParamMap({ ...valid, time: '9999' }));
        await flush();

        params$.next(convertToParamMap(valid));
        await flush();
        fixture.detectChanges();

        expect(fetchCalendar).toHaveBeenCalledTimes(2);
        expect(hasNotFound(fixture)).toBe(true);
    });

    it('見つからない表示のまま操作帯で路線を替えると、Router を通して URL を確かめて戻る', async () => {
        const fixture = await create({ ...valid, station_id: 's1' });
        expect(hasNotFound(fixture)).toBe(true);
        navigate.mockImplementation(
            async (commands: [string, Record<string, string>]) => {
                params$.next(convertToParamMap(commands[1]));
                return true;
            },
        );

        fixture.componentInstance.onRouteIdChange(ROUTE_2);
        await flush();
        fixture.detectChanges();

        expect(navigate).toHaveBeenCalledTimes(1);
        expect(hasNotFound(fixture)).toBe(false);
        expect(hasBody(fixture)).toBe(true);
        expect(fetchTripBlocks).toHaveBeenCalled();
    });

    it('見つからない表示のまま操作帯で現在時刻に戻すと、Router を通して戻る', async () => {
        const fixture = await create({ ...valid, time: '9999' });
        navigate.mockImplementation(
            async (commands: [string, Record<string, string>]) => {
                params$.next(convertToParamMap(commands[1]));
                return true;
            },
        );

        fixture.componentInstance.onModeChange('now');
        await flush();
        fixture.detectChanges();

        expect(hasNotFound(fixture)).toBe(false);
        expect(hasBody(fixture)).toBe(true);
    });

    it('前の URL の「無い」が遅れて届いても、今の正しい URL を見つからない表示にしない', async () => {
        const first$ = new Subject<boolean>();
        fetchCalendar.mockReturnValueOnce(first$).mockReturnValue(of(true));
        const fixture = await create(valid);

        params$.next(convertToParamMap({ ...valid, calendar_id: CAL_2 }));
        await flush();
        first$.next(false);
        first$.complete();
        await flush();
        fixture.detectChanges();

        expect(mark).not.toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(false);
        expect(hasBody(fixture)).toBe(true);
    });

    it('前の URL の「無い」が遅れて届いても、値の無い URL（取得を始めない）を見つからない表示にしない', async () => {
        const first$ = new Subject<boolean>();
        fetchCalendar.mockReturnValueOnce(first$).mockReturnValue(of(true));
        const fixture = await create(valid);

        params$.next(convertToParamMap({}));
        await flush();
        first$.next(false);
        first$.complete();
        await flush();
        fixture.detectChanges();

        expect(mark).not.toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(false);
    });

    it('前の URL の「無い」が遅れて届いても、不正な URL（取得を始めない）の見つからない表示は 1 回だけ', async () => {
        const first$ = new Subject<boolean>();
        fetchCalendar.mockReturnValueOnce(first$);
        const fixture = await create(valid);

        params$.next(convertToParamMap({ ...valid, time: '9999' }));
        await flush();
        expect(mark).toHaveBeenCalledTimes(1);
        first$.next(false);
        first$.complete();
        await flush();
        fixture.detectChanges();

        expect(mark).toHaveBeenCalledTimes(1);
        expect(hasNotFound(fixture)).toBe(true);
    });

    it('取得の途中で見つからない URL へ移り、同じ URL へ戻ると、取り直す（骨組みのままにならない）', async () => {
        const first$ = new Subject<undefined>();
        fetchTripBlocks.mockReturnValueOnce(first$);
        const fixture = await create(valid);

        params$.next(convertToParamMap({ ...valid, time: '9999' }));
        await flush();
        params$.next(convertToParamMap(valid));
        await flush();
        fixture.detectChanges();

        expect(fetchTripBlocks).toHaveBeenCalledTimes(2);
        expect(hasNotFound(fixture)).toBe(false);
        expect(
            TestBed.inject(TrainLocationStore).hasFetchedTrainLocation(),
        ).toBe(true);
    });

    it('取得の途中で値の無い URL へ移り、補いが同じ URL へ戻るとき、取り直す（骨組みのままにならない）', async () => {
        const first$ = new Subject<undefined>();
        fetchTripBlocks.mockReturnValueOnce(first$);
        await create(valid);

        params$.next(convertToParamMap({}));
        await flush();
        params$.next(convertToParamMap(valid));
        await flush();

        expect(fetchTripBlocks).toHaveBeenCalledTimes(2);
        expect(
            TestBed.inject(TrainLocationStore).hasFetchedTrainLocation(),
        ).toBe(true);
    });

    it('取り終えたあとの同じ URL では、取り直さない', async () => {
        await create(valid);

        params$.next(convertToParamMap({ ...valid }));
        await flush();

        expect(fetchTripBlocks).toHaveBeenCalledTimes(1);
    });

    it('見つからない表示のとき、読み込みの帯は出さない', async () => {
        const fixture = await create({ ...valid, time: '9999' });
        TestBed.inject(TrainLocationStore).enableLoading();
        fixture.detectChanges();

        expect(has(fixture, 'mat-progress-bar')).toBe(false);
    });
});
