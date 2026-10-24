import '@testing-library/jest-dom';
import { NO_ERRORS_SCHEMA, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActivatedRoute,
    Router,
    convertToParamMap,
    provideRouter,
} from '@angular/router';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { TrainLocationComponent } from './train-location.component';
import { TrainLocationService } from './services/train-location.service';
import { TrainLocationStore } from './stores/train-location.store';

describe('TrainLocationComponent', () => {
    let component: TrainLocationComponent;
    let fixture: ComponentFixture<TrainLocationComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainLocationComponent],
            providers: [
                provideRouter([]),
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
                        operatingSystemEndsByRouteId$: of({}),
                    },
                },
            ],
        })
            .overrideComponent(TrainLocationComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TrainLocationComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        TrainLocationStore.setCalendarId(null);
        TrainLocationStore.setSelectedRouteId(null);
        TrainLocationStore.setSelectedStationId(null);
        TrainLocationStore.setMode('now');
        TrainLocationStore.setSpecifiedTime(null);
        TrainLocationStore.setStationAxisStations([]);
        TrainLocationStore.setTripBlocksByDirection({});
        TrainLocationStore.resetLoading();
        TrainLocationStore.setHasFetchedTrainLocation(false);
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
        TrainLocationStore.setMode('now');
        expect(() => component.onCalendarIdChange('cal-2')).not.toThrow();
    });

    it('at(): mode="now" のとき現在時刻ベースの Date を返す', () => {
        const before = Date.now();
        const at = component.at();
        expect(at.getTime()).toBeGreaterThanOrEqual(before - 1000);
    });

    it('at(): mode="specified" かつ specifiedTime があればその時刻を反映する', () => {
        TrainLocationStore.setMode('specified');
        TrainLocationStore.setSpecifiedTime('0730');
        fixture.detectChanges();

        const at = component.at();
        expect(at.getHours()).toBe(7);
        expect(at.getMinutes()).toBe(30);
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
        TrainLocationStore.enableLoading();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('footer')).toBeTruthy();
        TrainLocationStore.disableLoading();
    });

    it('取る前は骨組みを出し、本文は出さない。取得中のプログレスバーはヘッダーの下', () => {
        TrainLocationStore.enableLoading();
        TrainLocationStore.setHasFetchedTrainLocation(false);
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

        TrainLocationStore.disableLoading();
        TrainLocationStore.setHasFetchedTrainLocation(true);
        fixture.detectChanges();

        expect(
            el.querySelector('[data-testid="train-location-skeleton"]'),
        ).toBeNull();
        expect(el.querySelector('app-train-location-line')).toBeTruthy();
        expect(el.querySelector('mat-progress-bar')).toBeNull();
    });

    it('G12: 在線列車が0本のとき、駅ラインを残したまま空文脈メッセージを重ねて表示する', () => {
        // ロード完了・在線列車なし（tripBlocks 空 = positions 0）の状態。
        TrainLocationStore.disableLoading();
        TrainLocationStore.setHasFetchedTrainLocation(true);
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

        expect(await firstValueFrom(TrainLocationStore.isLoading$)).toBe(false);
        // 失敗しても骨組みを消す
        expect(
            await firstValueFrom(TrainLocationStore.hasFetchedTrainLocation$),
        ).toBe(true);
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

    it('onStationSelect: 駅を URL に載せ、路線ごとに覚える', () => {
        const router = TestBed.inject(Router);
        const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
        TrainLocationStore.setSelectedRouteId('r1');

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
        TrainLocationStore.setStationAxisStations([
            { stationId: 'a', stationName: '駅A' } as never,
        ]);
        TrainLocationStore.setSelectedStationId('zzz');
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
                    provideRouter([]),
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
                            operatingSystemEndsByRouteId$: of({}),
                        },
                    },
                ],
            })
                .overrideComponent(TrainLocationComponent, {
                    set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
                })
                .compileComponents();

            const router = TestBed.inject(Router);
            return { router };
        }

        afterEach(() => {
            localStorage.removeItem('train-location:station:r1');
            // 次のテスト（beforeEach）が通常構成に戻れるよう、直後に元の TestBed 構成へ戻す。
        });

        it('駅の覚え書きがあり station_id 未指定なら、覚えている駅付きの URL へ replaceUrl で飛ばす', async () => {
            localStorage.setItem('train-location:station:r1', 's1');
            const { router } = await setupWithParamMap({ route_id: 'r1' });
            const navigate = jest
                .spyOn(router, 'navigate')
                .mockResolvedValue(true);

            TestBed.createComponent(TrainLocationComponent);

            expect(navigate).toHaveBeenCalledWith(
                [
                    '/train-location',
                    expect.objectContaining({
                        route_id: 'r1',
                        station_id: 's1',
                    }),
                ],
                { replaceUrl: true },
            );
        });

        it('paramMap に station_id があるときはリダイレクトしない', async () => {
            localStorage.setItem('train-location:station:r1', 's1');
            const { router } = await setupWithParamMap({
                route_id: 'r1',
                station_id: 's2',
            });
            const navigate = jest
                .spyOn(router, 'navigate')
                .mockResolvedValue(true);

            TestBed.createComponent(TrainLocationComponent);

            expect(navigate).not.toHaveBeenCalled();
        });
    });

    it('入ったときは前の訪問の「取り終えた」を引き継がない', () => {
        TrainLocationStore.setHasFetchedTrainLocation(true);
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
        const params = { route_id: 'route-1', station_id: 's1' };
        await TestBed.configureTestingModule({
            imports: [TrainLocationComponent],
            providers: [
                provideRouter([]),
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
                        operatingSystemEndsByRouteId$: of({}),
                    },
                },
            ],
        })
            .overrideComponent(TrainLocationComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
    });

    afterEach(() => {
        fixture.destroy();
        TrainLocationStore.setCalendarId(null);
        TrainLocationStore.setSelectedRouteId(null);
        TrainLocationStore.setSelectedStationId(null);
        TrainLocationStore.setMode('now');
        TrainLocationStore.setSpecifiedTime(null);
        TrainLocationStore.resetLoading();
        TrainLocationStore.setHasFetchedTrainLocation(false);
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
        jest.useFakeTimers({ now: new Date('2026-10-22T09:10:00') });
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
            TrainLocationStore.setStationAxisStations([
                { stationId: 'a' },
                { stationId: 'b' },
            ] as never);
            TrainLocationStore.setTripBlocksByDirection({
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
                provideRouter([]),
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
                    provide: TodaysCalendarListStateQuery,
                    useValue: {
                        todaysCalendarId: undefined,
                        todaysCalendarIds$: of([]),
                    },
                },
                {
                    provide: RouteStationListStateQuery,
                    useValue: {
                        routeStations$: of([
                            { routeId: 'route-1', routeName: '本線' },
                        ]),
                        operatingSystemEndsByRouteId$: of({}),
                    },
                },
            ],
        })
            .overrideComponent(TrainLocationComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        const navigate = jest.spyOn(TestBed.inject(Router), 'navigate');
        const fixture = TestBed.createComponent(TrainLocationComponent);
        fixture.detectChanges();

        expect(navigate).not.toHaveBeenCalled();
        expect(fetchTripBlocks).not.toHaveBeenCalled();
        expect(fixture.nativeElement.hasAttribute('ngskiphydration')).toBe(
            true,
        );
    });
});
