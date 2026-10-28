import { provideHttpClient, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA, PLATFORM_ID, Provider, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
    Router,
} from '@angular/router';
import {
    EMPTY,
    firstValueFrom,
    Observable,
    of,
    ReplaySubject,
    Subject,
    switchMap,
    throwError,
    timer,
} from 'rxjs';

import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { SsrResponse } from 'src/app/core/ssr/ssr-response';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { CalendarListState } from 'src/app/global-states/calendar-list.state';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { UserState } from 'src/app/global-states/user.state';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { CalendarSelectDialogService } from 'src/app/shared/calendar-select-dialog/services/calendar-select-dialog.service';
import { ConfirmDialogService } from 'src/app/shared/confirm-dialog/services/confirm-dialog.service';
import { TimetableAllLineService } from './services/timetable-all-line.service';
import { TimetableAllLineStore } from './stores/timetable-all-line.store';
import { TimetableAllLineComponent } from './timetable-all-line.component';
import { LazyOptionsDirective } from 'src/app/shared/lazy-options/lazy-options.directive';

describe('TimetableAllLineComponent', () => {
    let component: TimetableAllLineComponent;
    let fixture: ComponentFixture<TimetableAllLineComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([]),
                TimetableAllLineService,
                {
                    provide: CalendarListState,
                    useValue: {
                        entityMap: signal({}),
                        calendars: signal([]),
                    },
                },
                {
                    provide: ErrorHandlerService,
                    useValue: { handleError: () => {} },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
                {
                    provide: LoadingService,
                    useValue: { open: () => {}, close: () => {} },
                },
                {
                    provide: ConfirmDialogService,
                    useValue: { open: () => ({ afterClosed: () => EMPTY }) },
                },
                {
                    provide: CalendarSelectDialogService,
                    useValue: { open: () => ({ afterClosed: () => EMPTY }) },
                },
            ],
        })
            .overrideComponent(TimetableAllLineComponent, {
                set: {
                    imports: [LazyOptionsDirective],
                    schemas: [NO_ERRORS_SCHEMA],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableAllLineComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

describe('TimetableAllLineComponent をサーバーで描くとき', () => {
    it('書ける役割でも編集の行を出さない（サーバーはゲストの形で描く）', async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([]),
                { provide: PLATFORM_ID, useValue: 'server' },
                {
                    provide: UserState,
                    useValue: { canEditTimetable: () => true },
                },
                TimetableAllLineService,
                {
                    provide: CalendarListState,
                    useValue: {
                        entityMap: signal({}),
                        calendars: signal([]),
                    },
                },
                {
                    provide: ErrorHandlerService,
                    useValue: { handleError: () => {} },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
                {
                    provide: LoadingService,
                    useValue: { open: () => {}, close: () => {} },
                },
                { provide: ConfirmDialogService, useValue: {} },
                { provide: CalendarSelectDialogService, useValue: {} },
            ],
        })
            .overrideComponent(TimetableAllLineComponent, {
                set: {
                    imports: [LazyOptionsDirective],
                    schemas: [NO_ERRORS_SCHEMA],
                },
            })
            .compileComponents();

        const component = TestBed.createComponent(
            TimetableAllLineComponent,
        ).componentInstance;

        expect(component.canEdit()).toBe(false);
    });
});

describe('TimetableAllLineComponent の URL の向き', () => {
    const setUp = async (
        params: Record<string, string>,
        extraProviders: Provider[] = [],
    ) => {
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineComponent],
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
                    provide: TimetableAllLineService,
                    useValue: {
                        fetchStations: jest.fn(() => of(undefined)),
                        fetchTripBlocks: jest.fn(() => of(undefined)),
                    },
                },
                {
                    provide: CalendarListState,
                    useValue: {
                        entityMap: signal({}),
                        calendars: signal([]),
                    },
                },
                {
                    provide: ErrorHandlerService,
                    useValue: { handleError: () => {} },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
                {
                    provide: LoadingService,
                    useValue: { open: () => {}, close: () => {} },
                },
                { provide: ConfirmDialogService, useValue: {} },
                { provide: CalendarSelectDialogService, useValue: {} },
                ...extraProviders,
            ],
        })
            .overrideComponent(TimetableAllLineComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();

        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
        TestBed.createComponent(TimetableAllLineComponent);
        return {
            navigate,
            service: TestBed.inject(TimetableAllLineService) as unknown as {
                fetchStations: jest.Mock;
                fetchTripBlocks: jest.Mock;
            },
        };
    };

    it.each([
        ['無い', {}],
        ['読めない', { trip_direction: 'abc' }],
    ])('向きが%sときは上りに置き換え、取得はしない', async (_, extra) => {
        const { navigate, service } = await setUp({
            calendar_id: 'cal-1',
            ...extra,
        });

        expect(navigate).toHaveBeenCalledWith(
            [
                'timetable',
                'all-line',
                { calendar_id: 'cal-1', trip_direction: 0 },
            ],
            { replaceUrl: true },
        );
        expect(service.fetchTripBlocks).not.toHaveBeenCalled();
    });

    it('向きが読めれば、そのまま使う', async () => {
        const { navigate } = await setUp({
            calendar_id: 'cal-1',
            trip_direction: '1',
        });

        expect(navigate).not.toHaveBeenCalled();
        expect(TestBed.inject(TimetableAllLineStore).tripDirection()).toBe(1);
    });

    it('サーバーではパラメータの足りない URL を補わず、取りにも行かない', async () => {
        const { navigate, service } = await setUp({ calendar_id: 'cal-1' }, [
            { provide: PLATFORM_ID, useValue: 'server' },
        ]);

        expect(navigate).not.toHaveBeenCalled();
        expect(service.fetchStations).not.toHaveBeenCalled();
    });

    it('サーバーではダイヤのタグを付ける', async () => {
        const addCacheTags = jest.fn();

        await setUp({ calendar_id: 'cal-1', trip_direction: '0' }, [
            { provide: PLATFORM_ID, useValue: 'server' },
            {
                provide: SsrResponse,
                useValue: { addCacheTags, setCachePolicy: jest.fn() },
            },
        ]);

        expect(addCacheTags).toHaveBeenCalledWith(['calendar:cal-1']);
    });
});

describe('TimetableAllLineComponent の読み込み中', () => {
    let fixture: ComponentFixture<TimetableAllLineComponent>;
    let tripBlocks$: Subject<undefined>;
    let stations$: Observable<undefined>;
    let fetchTripBlocksCalls = 0;
    let canEditTimetable: boolean;

    beforeEach(() => {
        stations$ = of(undefined);
    });

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const query = (selector: string) =>
        (fixture.nativeElement as HTMLElement).querySelector(selector);

    const setup = async (
        params: Record<string, string>,
        beforeCreate?: (
            store: InstanceType<typeof TimetableAllLineStore>,
        ) => void,
    ) => {
        tripBlocks$ = new ReplaySubject<undefined>(1);
        fetchTripBlocksCalls = 0;
        canEditTimetable = false;
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineComponent],
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
                    provide: TimetableAllLineService,
                    useValue: {
                        fetchStations: () => stations$,
                        fetchTripBlocks: () => {
                            fetchTripBlocksCalls++;
                            return tripBlocks$;
                        },
                        deleteTripFromTripBlock: () => of(undefined),
                    },
                },
                {
                    provide: CalendarListState,
                    useValue: {
                        entityMap: signal({}),
                        calendars: signal([]),
                    },
                },
                {
                    provide: ErrorHandlerService,
                    useValue: { handleError: () => {} },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
                {
                    provide: LoadingService,
                    useValue: { open: () => {}, close: () => {} },
                },
                {
                    provide: ConfirmDialogService,
                    useValue: { open: () => ({ afterClosed: () => of(true) }) },
                },
                { provide: CalendarSelectDialogService, useValue: {} },
                {
                    provide: UserState,
                    useValue: { canEditTimetable: () => canEditTimetable },
                },
            ],
        })
            .overrideComponent(TimetableAllLineComponent, {
                set: {
                    imports: [LazyOptionsDirective],
                    schemas: [NO_ERRORS_SCHEMA],
                },
            })
            .compileComponents();
        beforeCreate?.(TestBed.inject(TimetableAllLineStore));
        fixture = TestBed.createComponent(TimetableAllLineComponent);
        fixture.detectChanges();
    };

    afterEach(() => {
        jest.restoreAllMocks();
        fixture.destroy();
    });

    it('ダイヤがあって取り終わるまでは、表の骨組みを出し、本物の表は出さない', async () => {
        await setup({ calendar_id: 'cal-1', trip_direction: '0' });

        expect(query('[data-testid="all-line-table-skeleton"]')).not.toBeNull();
        expect(query('app-timetable-all-line-table')).toBeNull();
        // 路線の絞り込みは自分で骨組みを出すので、取る前から置く
        expect(query('app-timetable-all-line-route-filter')).not.toBeNull();
    });

    it('取り終えたら骨組みを消して表を出す', async () => {
        await setup({ calendar_id: 'cal-1', trip_direction: '0' });

        tripBlocks$.next(undefined);
        tripBlocks$.complete();
        await flush();
        fixture.detectChanges();

        expect(query('[data-testid="all-line-table-skeleton"]')).toBeNull();
        expect(query('app-timetable-all-line-table')).not.toBeNull();
    });

    it.each([
        [false, false],
        [true, true],
    ])(
        '編集の操作を出すかは、役割から決めて表に渡す（編集者か=%s なら canEdit=%s）',
        async (isEditor, expected) => {
            await setup({ calendar_id: 'cal-1', trip_direction: '0' });
            fixture.destroy();
            canEditTimetable = isEditor;
            fixture = TestBed.createComponent(TimetableAllLineComponent);
            fixture.detectChanges();
            tripBlocks$.next(undefined);
            tripBlocks$.complete();
            await flush();
            fixture.detectChanges();

            const table = query('app-timetable-all-line-table') as unknown as {
                canEdit: boolean;
            };
            expect(table.canEdit).toBe(expected);
        },
    );

    it('失敗しても骨組みを消す', async () => {
        // fetchData() は失敗を投げ直す（既存の振る舞い）。コンストラクタは受け止めないので、ここだけ受け流す
        const original = TimetableAllLineComponent.prototype.fetchData;
        const spy = jest
            .spyOn(TimetableAllLineComponent.prototype, 'fetchData')
            .mockImplementation(function (this: TimetableAllLineComponent) {
                return original.call(this).catch(() => undefined);
            });
        await setup({ calendar_id: 'cal-1', trip_direction: '0' });

        tripBlocks$.error(new Error('offline'));
        await flush();
        fixture.detectChanges();
        spy.mockRestore();

        expect(query('[data-testid="all-line-table-skeleton"]')).toBeNull();
    });

    it('駅一覧の応答を待たずに、trip-blocks の取得を始める', async () => {
        stations$ = new Subject<undefined>();
        await setup({ calendar_id: 'cal-1', trip_direction: '0' });
        await flush();

        expect(fetchTripBlocksCalls).toBe(1);
        // 片方が残っている間は、まだ取り終わらない
        expect(query('[data-testid="all-line-table-skeleton"]')).not.toBeNull();
    });

    it('駅一覧と trip-blocks の両方が終わってから、骨組みを消す', async () => {
        const stations = new Subject<undefined>();
        stations$ = stations;
        await setup({ calendar_id: 'cal-1', trip_direction: '0' });

        tripBlocks$.next(undefined);
        tripBlocks$.complete();
        await flush();
        fixture.detectChanges();
        expect(query('[data-testid="all-line-table-skeleton"]')).not.toBeNull();

        stations.next(undefined);
        stations.complete();
        await flush();
        fixture.detectChanges();
        expect(query('[data-testid="all-line-table-skeleton"]')).toBeNull();
    });

    it.each([
        ['駅一覧', true],
        ['trip-blocks', false],
    ])(
        '%s の取得が失敗したら、失敗は fetchData の外へ出て、読み込み中は戻る',
        async (_, stationsFail) => {
            const original = TimetableAllLineComponent.prototype.fetchData;
            let rejected: unknown;
            jest.spyOn(
                TimetableAllLineComponent.prototype,
                'fetchData',
            ).mockImplementation(function (this: TimetableAllLineComponent) {
                return original.call(this).catch((e) => {
                    rejected = e;
                });
            });
            if (stationsFail) {
                stations$ = throwError(() => new Error('offline'));
            }
            await setup({ calendar_id: 'cal-1', trip_direction: '0' });
            if (stationsFail) {
                // 失敗を決めるのは両方の取得が終わってから（もう片方は成功で終わらせる）
                tripBlocks$.next(undefined);
                tripBlocks$.complete();
            } else {
                tripBlocks$.error(new Error('offline'));
            }
            await flush();

            expect(rejected).toBeInstanceOf(Error);
            expect(TestBed.inject(TimetableAllLineStore).isLoading()).toBe(
                false,
            );
        },
    );

    it('ダイヤが無ければ骨組みを出さない（検索カードも置かない）', async () => {
        await setup({});

        expect(query('[data-testid="all-line-table-skeleton"]')).toBeNull();
        expect(query('app-timetable-search-card')).toBeNull();
    });

    it('条件を変えて取り直すときは骨組みに戻す', async () => {
        await setup({ calendar_id: 'cal-1', trip_direction: '0' });
        tripBlocks$.next(undefined);
        tripBlocks$.complete();
        await flush();
        fixture.detectChanges();

        tripBlocks$ = new ReplaySubject<undefined>(1);
        fixture.componentInstance.fetchData().catch(() => undefined);
        fixture.detectChanges();

        expect(query('[data-testid="all-line-table-skeleton"]')).not.toBeNull();
    });

    it('入ったときは前の訪問の「取り終えた」を引き継がない', async () => {
        // 向きの無い URL は取得せず置き換えるだけ（取得の始めのリセットでは骨組みに戻らない道）
        jest.spyOn(Router.prototype, 'navigate').mockResolvedValue(true);

        await setup({ calendar_id: 'cal-1' }, (store) => {
            store.setCalendarId('cal-old');
            store.setHasFetchedTripBlocks(true);
        });

        expect(fetchTripBlocksCalls).toBe(0);
        expect(query('[data-testid="all-line-table-skeleton"]')).not.toBeNull();
    });

    it('取得中はプログレスバーがヘッダーの下に出て、スピナーは出さない。取り終えたらバーは消える', async () => {
        await setup({ calendar_id: 'cal-1', trip_direction: '0' });

        const bar = query('mat-progress-bar');
        expect(bar).not.toBeNull();
        expect(bar?.getAttribute('color')).toBe('accent');
        expect(bar?.parentElement?.className).toContain('tw-top-[48px]');
        expect(bar?.parentElement?.className).toContain('md:tw-top-[64px]');
        expect(query('app-loading')).toBeNull();

        tripBlocks$.next(undefined);
        tripBlocks$.complete();
        await flush();
        fixture.detectChanges();

        expect(query('mat-progress-bar')).toBeNull();
    });

    it('取り終えた後の編集・削除の取り直し（fetchTripBlocks を直接呼ぶ道）では骨組みに戻らず、表を出したまま差し替える', async () => {
        await setup({ calendar_id: 'cal-1', trip_direction: '0' });
        tripBlocks$.next(undefined);
        tripBlocks$.complete();
        await flush();
        fixture.detectChanges();
        expect(query('[data-testid="all-line-table-skeleton"]')).toBeNull();
        expect(fetchTripBlocksCalls).toBe(1);

        // 取り直しは終わらせない（取り直しの最中に骨組みへ戻らないことを見る）
        tripBlocks$ = new Subject<undefined>();
        fixture.componentInstance.onClickedDeleteTripInGroup({
            base: { tripNumber: '1' } as never,
            target: { tripId: 't2', tripNumber: '2' } as never,
        });
        await flush();
        fixture.detectChanges();

        expect(fetchTripBlocksCalls).toBe(2);
        expect(query('[data-testid="all-line-table-skeleton"]')).toBeNull();
        expect(query('app-timetable-all-line-table')).not.toBeNull();
    });

    it('ページを離れてすぐ戻ったとき、前のインスタンスの取得が後から終わっても、新しい取得が終わるまで骨組みは消えない', async () => {
        await setup({ calendar_id: 'cal-1', trip_direction: '0' });
        // 1 つ目の取得が駅を取り終えて trip-blocks を取りに行くまで待つ（待たないと 1 つ目も新しい Subject を受け取る）
        await flush();
        expect(fetchTripBlocksCalls).toBe(1);
        const previousTripBlocks$ = tripBlocks$;
        fixture.destroy();
        tripBlocks$ = new ReplaySubject<undefined>(1);
        fixture = TestBed.createComponent(TimetableAllLineComponent);
        fixture.detectChanges();

        previousTripBlocks$.next(undefined);
        previousTripBlocks$.complete();
        await flush();
        fixture.detectChanges();
        expect(query('[data-testid="all-line-table-skeleton"]')).not.toBeNull();

        tripBlocks$.next(undefined);
        tripBlocks$.complete();
        await flush();
        fixture.detectChanges();
        expect(query('[data-testid="all-line-table-skeleton"]')).toBeNull();
    });
});

describe('TimetableAllLineComponent の帯の操作', () => {
    let component: TimetableAllLineComponent;
    let navigate: jest.SpyInstance;
    const params: Record<string, string> = {
        calendar_id: 'cal-1',
        trip_direction: '1',
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: { params },
                        paramMap: of(convertToParamMap(params)),
                    },
                },
                {
                    provide: TimetableAllLineService,
                    useValue: {
                        fetchStations: jest.fn(() => of(undefined)),
                        fetchTripBlocks: jest.fn(() => of(undefined)),
                    },
                },
                {
                    provide: CalendarListState,
                    useValue: {
                        entityMap: signal({}),
                        calendars: signal([]),
                    },
                },
                {
                    provide: ErrorHandlerService,
                    useValue: { handleError: () => {} },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
                {
                    provide: LoadingService,
                    useValue: { open: () => {}, close: () => {} },
                },
                { provide: ConfirmDialogService, useValue: {} },
                { provide: CalendarSelectDialogService, useValue: {} },
            ],
        })
            .overrideComponent(TimetableAllLineComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();
        navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
        component = TestBed.createComponent(
            TimetableAllLineComponent,
        ).componentInstance;
        navigate.mockClear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete params['trip_block_id'];
    });

    it('列車番号のリンクで開いた画面でダイヤ・方向を替えると、trip_block_id を落として全列車に戻す', () => {
        params['trip_block_id'] = 'tb-1';
        component.onCalendarChange('cal-2');
        component.onDirectionChange(0);
        expect(navigate).toHaveBeenNthCalledWith(1, [
            'timetable',
            'all-line',
            { calendar_id: 'cal-2', trip_direction: '1' },
        ]);
        expect(navigate).toHaveBeenNthCalledWith(2, [
            'timetable',
            'all-line',
            { calendar_id: 'cal-1', trip_direction: 0 },
        ]);
    });

    it('ダイヤを替えると、方向などはそのままで calendar_id だけ替える', () => {
        component.onCalendarChange('cal-2');
        expect(navigate).toHaveBeenCalledWith([
            'timetable',
            'all-line',
            { calendar_id: 'cal-2', trip_direction: '1' },
        ]);
    });

    it('同じダイヤを選んでも移らない', () => {
        TestBed.inject(TimetableAllLineStore).setCalendarId('cal-1');
        component.onCalendarChange('cal-1');
        expect(navigate).not.toHaveBeenCalled();
    });

    it('駅を選ぶと、同じダイヤ・方向で駅別時刻表へ移る', () => {
        TestBed.inject(TimetableAllLineStore).setCalendarId('cal-1');
        TestBed.inject(TimetableAllLineStore).setTripDirection(1);
        component.onStationSelect('st-9');
        expect(navigate).toHaveBeenCalledWith([
            'timetable',
            'station',
            { calendar_id: 'cal-1', station_id: 'st-9', trip_direction: 1 },
        ]);
    });

    it('畳んだ状態は collapsedChange で受け、collapsed に返す', () => {
        expect(component.controlCollapsed()).toBe(false);
        component.onControlCollapsedChange(true);
        expect(component.controlCollapsed()).toBe(true);
        component.onControlCollapsedChange(false);
        expect(component.controlCollapsed()).toBe(false);
    });

    it('上り下りの切替は、押した向きへ移る', () => {
        component.onDirectionChange(0);
        expect(navigate).toHaveBeenCalledWith([
            'timetable',
            'all-line',
            { calendar_id: 'cal-1', trip_direction: 0 },
        ]);
    });
});

describe('TimetableAllLineComponent の圏外の保存', () => {
    let fixture: ComponentFixture<TimetableAllLineComponent>;
    let fetchDataSpy: jest.SpyInstance;
    let originalFetchData: TimetableAllLineComponent['fetchData'];
    let stations$: Observable<undefined>;
    let tripBlocks$: Observable<undefined>;
    const save = jest.fn(() => Promise.resolve());
    const restore = jest.fn();

    const stations = [{ stationId: 'st-1' }] as never;
    const agencies = [{ agencyId: 'ag-1' }] as never;
    const routeOrder = ['route-1'];
    const tripBlocks = [{ tripBlockId: 'block-1' }] as never;
    const conditions = { calendarId: 'cal-1', tripDirection: 0 };

    const flush = () => new Promise((resolve) => setTimeout(resolve, 10));
    // 次のタスクで失敗する取得。すぐ失敗させると、Zone の Promise と async/await の順序の都合で
    // 「処理されない拒否」と見なされ、ComponentFixture が投げ直してしまう
    const failLater = (message: string) =>
        timer(0).pipe(switchMap(() => throwError(() => new Error(message))));

    const setup = async () => {
        // fetchData() は失敗を投げ直す（既存の振る舞い）。コンストラクタは受け止めないので、
        // 本物の fetchData の失敗だけ受け流す
        originalFetchData = TimetableAllLineComponent.prototype.fetchData;
        const original = originalFetchData;
        fetchDataSpy = jest
            .spyOn(TimetableAllLineComponent.prototype, 'fetchData')
            .mockImplementation(function (this: TimetableAllLineComponent) {
                return original.call(this).catch(() => undefined);
            });
        const params = { calendar_id: 'cal-1', trip_direction: '0' };
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineComponent],
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
                    provide: TimetableAllLineService,
                    useValue: {
                        fetchStations: () => stations$,
                        fetchTripBlocks: () => tripBlocks$,
                    },
                },
                {
                    provide: AgencyListState,
                    useValue: { agencies: signal(agencies) },
                },
                {
                    provide: RouteStationListState,
                    useValue: {
                        routeStations: signal(
                            routeOrder.map((routeId) => ({ routeId })),
                        ),
                    },
                },
                {
                    provide: CalendarListState,
                    useValue: {
                        entityMap: signal({}),
                        calendars: signal([]),
                    },
                },
                {
                    provide: ErrorHandlerService,
                    useValue: { handleError: () => {} },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
                {
                    provide: LoadingService,
                    useValue: { open: () => {}, close: () => {} },
                },
                { provide: ConfirmDialogService, useValue: {} },
                { provide: CalendarSelectDialogService, useValue: {} },
                {
                    provide: UserState,
                    useValue: { canEditTimetable: () => false },
                },
                { provide: OfflineSnapshots, useValue: { save, restore } },
            ],
        })
            .overrideComponent(TimetableAllLineComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();
    };

    afterEach(() => {
        fetchDataSpy.mockRestore();
        fixture?.destroy();
        jest.clearAllMocks();
        restore.mockReset();
    });

    it('成功したら条件と中身を保存する', async () => {
        stations$ = of(undefined);
        tripBlocks$ = of(undefined);
        await setup();
        TestBed.inject(TimetableAllLineStore).setStations(stations);
        TestBed.inject(TimetableAllLineStore).setTripBlocks(tripBlocks);

        fixture = TestBed.createComponent(TimetableAllLineComponent);
        await flush();

        expect(save).toHaveBeenCalledWith({
            key: 'TimetableAllLine',
            conditions,
            data: { stations, agencies, routeOrder, tripBlocks },
        });
        expect(restore).not.toHaveBeenCalled();
    });

    it('失敗したら保存した中身を、読み込み中を解く前に戻し、路線の選択を中身に合わせる', async () => {
        stations$ = of(undefined);
        tripBlocks$ = failLater('offline');
        await setup();
        let isLoadingWhenRestored: boolean | undefined;
        restore.mockImplementation(
            (params: { apply: (data: unknown, savedAt: number) => void }) => {
                isLoadingWhenRestored = fixture.componentInstance.isLoading();
                params.apply(
                    {
                        stations: [
                            {
                                stationId: 'st-1',
                                routeStationLists: [
                                    { route: { routeId: 'route-9' } },
                                ],
                            },
                        ],
                        agencies,
                        routeOrder,
                        tripBlocks,
                    },
                    0,
                );
                return Promise.resolve(null);
            },
        );

        fixture = TestBed.createComponent(TimetableAllLineComponent);
        await flush();

        expect(save).not.toHaveBeenCalled();
        expect(restore).toHaveBeenCalledWith({
            key: 'TimetableAllLine',
            conditions,
            apply: expect.any(Function),
        });
        expect(isLoadingWhenRestored).toBe(true);
        expect(TestBed.inject(TimetableAllLineStore).visibleStations()).toEqual(
            [expect.objectContaining({ stationId: 'st-1' })],
        );
        // 戻した駅の路線に選択を合わせている（自社の路線が無いので全路線 ON のフォールバック）
        expect(
            TestBed.inject(TimetableAllLineStore).selectedRouteIds(),
        ).toEqual(['route-9']);
        expect(fixture.componentInstance.isLoading()).toBe(false);
    });

    it('片方が先に失敗しても、もう片方が終わってから戻す', async () => {
        const tripBlocksLate = new Subject<undefined>();
        stations$ = failLater('offline');
        tripBlocks$ = tripBlocksLate;
        await setup();

        fixture = TestBed.createComponent(TimetableAllLineComponent);
        await flush();
        expect(restore).not.toHaveBeenCalled();

        tripBlocksLate.next(undefined);
        tripBlocksLate.complete();
        await flush();

        expect(restore).toHaveBeenCalledTimes(1);
        expect(save).not.toHaveBeenCalled();
    });

    it('古い取得が失敗しても、保存した中身は戻さない', async () => {
        stations$ = of(undefined);
        // 取り直しが先に始まるよう、失敗は次のタスクよりさらに後に届ける
        // （fetchData の途中の await の数に、タスクの順が左右されないようにする）
        tripBlocks$ = timer(5).pipe(
            switchMap(() => throwError(() => new Error('offline-first'))),
        );
        await setup();
        fixture = TestBed.createComponent(TimetableAllLineComponent);
        // 先の取得が trip-blocks を取りに行くまで待つ（取る前に差し替えると先の取得も成功してしまう）
        await new Promise((resolve) => setTimeout(resolve, 0));

        // 取り直しを始めてから、先の取得の失敗が届く
        tripBlocks$ = of(undefined);
        await fixture.componentInstance.fetchData();
        await flush();

        expect(restore).not.toHaveBeenCalled();
    });

    it('戻す処理が壊れていても、元の取得の失敗を投げ直す', async () => {
        stations$ = of(undefined);
        tripBlocks$ = failLater('offline');
        await setup();
        restore.mockRejectedValue(new Error('restore broken'));

        fixture = TestBed.createComponent(TimetableAllLineComponent);
        await flush();

        // コンストラクタの取得は失敗を受け流すので、本物の fetchData を直接呼んで確かめる
        await expect(
            originalFetchData.call(fixture.componentInstance),
        ).rejects.toThrow('offline');

        expect(restore).toHaveBeenCalled();
        expect(fixture.componentInstance.isLoading()).toBe(false);
        expect(
            TestBed.inject(TimetableAllLineStore).hasFetchedTripBlocks(),
        ).toBe(true);
    });
});

describe('TimetableAllLineComponent がストアから読む名前', () => {
    const route = (routeId: string) => ({
        routeStationListId: routeId,
        route: { routeId, routeName: routeId },
    });
    const rawStations = [
        {
            stationId: 'st-1',
            stationName: 'A',
            routeStationLists: [route('r1')],
        },
        {
            stationId: 'st-2',
            stationName: 'B',
            routeStationLists: [route('r2')],
        },
    ] as never;
    const tripBlocks = [
        {
            tripBlockId: 'tb-1',
            trips: [
                {
                    tripId: 't-1',
                    tripBlockId: 'tb-1',
                    times: [
                        {
                            stationId: 'st-1',
                            stopSequence: 1,
                            arrivalTime: null,
                            departureTime: '05:00:00',
                        },
                    ],
                },
            ],
        },
    ] as never;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap({})),
                        snapshot: { params: {} },
                    },
                },
                {
                    provide: TimetableAllLineService,
                    useValue: {
                        fetchStations: () => of(undefined),
                        fetchTripBlocks: () => of(undefined),
                    },
                },
                {
                    provide: CalendarListState,
                    useValue: {
                        entityMap: signal({}),
                        calendars: signal([]),
                    },
                },
                {
                    provide: ErrorHandlerService,
                    useValue: { handleError: () => {} },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
                {
                    provide: LoadingService,
                    useValue: { open: () => {}, close: () => {} },
                },
                { provide: ConfirmDialogService, useValue: {} },
                { provide: CalendarSelectDialogService, useValue: {} },
            ],
        })
            .overrideComponent(TimetableAllLineComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();
    });

    it('stations は取得したままの駅でなく、路線で絞った表示駅を読む', () => {
        const store = TestBed.inject(TimetableAllLineStore);
        const component = TestBed.createComponent(
            TimetableAllLineComponent,
        ).componentInstance;
        store.setStations(rawStations);
        store.setSelectedRouteIds(['r1']);

        expect(store.stations().length).toBe(2);
        expect(component.stations().map((s) => s.stationId)).toEqual(['st-1']);
    });

    it('pageSettings は件数（length）を列に出す列車の本数にしたものを読む', () => {
        const store = TestBed.inject(TimetableAllLineStore);
        const component = TestBed.createComponent(
            TimetableAllLineComponent,
        ).componentInstance;
        store.setStations(rawStations);
        store.setTripBlocks(tripBlocks);
        store.setSelectedRouteIds(['r1']);
        store.setPageSettings({ pageIndex: 0, pageSize: 10, length: 0 });

        expect(store.pageSettings().length).toBe(0);
        expect(component.pageSettings()).toEqual({
            pageIndex: 0,
            pageSize: 10,
            length: 1,
        });
        expect(component.trips().map((t) => t.tripId)).toEqual(['t-1']);
    });
});
