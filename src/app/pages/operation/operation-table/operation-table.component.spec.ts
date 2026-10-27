import { NO_ERRORS_SCHEMA, PLATFORM_ID, Provider, signal } from '@angular/core';
import {
    ComponentFixture,
    DeferBlockState,
    TestBed,
} from '@angular/core/testing';
import {
    ActivatedRoute,
    Router,
    convertToParamMap,
    provideRouter,
} from '@angular/router';
import {
    Observable,
    Subject,
    firstValueFrom,
    of,
    switchMap,
    throwError,
    timer,
} from 'rxjs';

import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { NotificationService } from 'src/app/core/services/notification.service';
import { SsrResponse } from 'src/app/core/ssr/ssr-response';
import { CalendarListState } from 'src/app/global-states/calendar-list.state';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { OperationTableComponent } from './operation-table.component';
import { OperationTableService } from './services/operation-table.service';
import {
    OperationTableStore,
    pickOperationTableSettings,
} from './stores/operation-table.store';

describe('OperationTableComponent', () => {
    let component: OperationTableComponent;
    let fixture: ComponentFixture<OperationTableComponent>;
    let router: Router;

    const todaysCalendarQueryMock = { todaysCalendarId: 'todays-calendar-id' };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationTableComponent],
            providers: [
                provideRouter([]),
                {
                    provide: OperationTableService,
                    useValue: {
                        fetchCalendar: () => of(undefined),
                        fetchOperationTrips: () => of(undefined),
                        fetchStations: () => of(undefined),
                        fetchTripClasses: () => of(undefined),
                        fetchItineraryLinks: () => of(undefined),
                    },
                },
                {
                    provide: CalendarListState,
                    useValue: { calendars: signal([]) },
                },
                {
                    provide: TodaysCalendarListStateQuery,
                    useValue: todaysCalendarQueryMock,
                },
                {
                    provide: NotificationService,
                    useValue: { open: () => {} },
                },
            ],
        })
            .overrideComponent(OperationTableComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        router = TestBed.inject(Router);
    });

    afterEach(() => {
        OperationTableStore.setCalendarId(null);
        OperationTableStore.setSelectedGroupNames([]);
        OperationTableStore.resetLoading();
    });

    const createComponent = () => {
        fixture = TestBed.createComponent(OperationTableComponent);
        component = fixture.componentInstance;
    };

    it('should create', () => {
        createComponent();
        expect(component).toBeTruthy();
    });

    it('無パラメータ時は今日の calendar_id へ replaceUrl でフォールバックする', () => {
        const navigateSpy = jest
            .spyOn(router, 'navigate')
            .mockResolvedValue(true);

        createComponent();

        expect(navigateSpy).toHaveBeenCalledWith(
            ['/operation/table', { calendar_id: 'todays-calendar-id' }],
            { replaceUrl: true },
        );
    });

    it('onCalendarChange で calendar_id を差し替えて遷移する', () => {
        const navigateSpy = jest
            .spyOn(router, 'navigate')
            .mockResolvedValue(true);

        createComponent();
        navigateSpy.mockClear();

        component.onCalendarChange('next-calendar-id');

        expect(navigateSpy).toHaveBeenCalledWith([
            '/operation/table',
            { calendar_id: 'next-calendar-id' },
        ]);
    });

    it('onCalendarChange: 空値では遷移しない', () => {
        const navigateSpy = jest
            .spyOn(router, 'navigate')
            .mockResolvedValue(true);

        createComponent();
        navigateSpy.mockClear();

        component.onCalendarChange('');

        expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('isCardVisible: 群未選択時は常に true（全カード表示）', () => {
        createComponent();
        expect(component.isCardVisible('11')).toBe(true);
    });

    it('groupNameFor: 群は運用番号から導く（リアルタイム運用情報と同じ規則）', () => {
        createComponent();

        expect(component.groupNameFor('31')).toBe('3群');
        expect(component.groupNameFor('91G')).toBe('G群（東横線）');
        expect(component.groupNameFor('79')).toBe('7群');
    });

    it('groupNameFor: 休車（運用番号100）は「休」', () => {
        createComponent();

        expect(component.groupNameFor('100')).toBe('休');
    });

    it('groupNameFor: 導けない運用番号なら undefined を返す（バッジ非表示）', () => {
        createComponent();

        expect(component.groupNameFor('K11')).toBeUndefined();
    });

    it('fetchData: 取得に失敗しても読み込み中を解く（通信断では保存済みのデータでカードを出す）', async () => {
        createComponent();
        const service = TestBed.inject(OperationTableService);
        jest.spyOn(service, 'fetchOperationTrips').mockReturnValue(
            throwError(() => new Error('offline')),
        );
        const loading: boolean[] = [];
        const subscription = OperationTableStore.isLoading$.subscribe((v) =>
            loading.push(v),
        );

        await expect(component.fetchData()).rejects.toThrow('offline');

        expect(loading[loading.length - 1]).toBe(false);
        subscription.unsubscribe();
    });

    describe('isEmpty: 運用が 0 件のときの案内', () => {
        beforeEach(() => {
            createComponent();
            OperationTableStore.setCalendar({ calendarId: 'c1' } as never);
            OperationTableStore.setOperationTrips([]);
        });

        afterEach(() => {
            OperationTableStore.setCalendar(null);
        });

        afterEach(() => {
            OperationTableStore.setHasFetchedOperationTrips(false);
        });

        it('取得中は出さない（届く前に「登録されていません」と見せない）', () => {
            OperationTableStore.enableLoading();
            OperationTableStore.setHasFetchedOperationTrips(false);

            expect(component.isEmpty()).toBe(false);
        });

        it('取得が終わって 0 件なら出す', () => {
            OperationTableStore.setHasFetchedOperationTrips(true);

            expect(component.isEmpty()).toBe(true);
        });
    });

    it('placeholderHeight: 見出しと余白 63px + 列車 32px + つなぎの行 8px', () => {
        createComponent();
        const trip = (tripDirection: number, depotIn = false) => ({
            trip: {
                tripId: `t${tripDirection}`,
                tripDirection,
                depotIn,
                depotOut: false,
            },
        });

        // 上り → 上り（つなぎ）→ 下り（折り返し）→ 下りで入庫（つなぎ）→ 下り（入庫後なのでつながない）
        const operationTrip = {
            operation: { operationId: 'op-1' },
            trips: [trip(0), trip(0), trip(1), trip(1, true), trip(1)],
        } as unknown as OperationTripsDto;

        expect(component.placeholderHeight(operationTrip)).toBe(
            63 + 5 * 32 + 2 * 8,
        );
    });

    describe('fetchData: つながりの取得', () => {
        it('つながりの取得が失敗しても fetchData は成功し、読み込み中を解く', async () => {
            createComponent();
            const service = TestBed.inject(OperationTableService);
            jest.spyOn(service, 'fetchItineraryLinks').mockReturnValue(
                throwError(() => new Error('500')),
            );

            await expect(component.fetchData()).resolves.toBeUndefined();

            let loading = true;
            OperationTableStore.isLoading$
                .subscribe((v) => (loading = v))
                .unsubscribe();
            expect(loading).toBe(false);
        });

        it('種別の取得が失敗したら、これまでどおり fetchData は失敗する', async () => {
            createComponent();
            const service = TestBed.inject(OperationTableService);
            jest.spyOn(service, 'fetchTripClasses').mockReturnValue(
                throwError(() => new Error('tripClasses failed')),
            );

            await expect(component.fetchData()).rejects.toThrow(
                'tripClasses failed',
            );
        });
    });

    describe('placeholderHeight: 前後の運用の文言', () => {
        const end = (p: object) =>
            ({
                stationId: 's',
                rule: 2,
                operationNumber: '12K',
                ...p,
            }) as never;
        const operationTrip = {
            operation: { operationId: 'op-1' },
            trips: [
                { trip: { tripId: 't1', tripDirection: 0, depotIn: true } },
                { trip: { tripId: 't2', tripDirection: 1, depotIn: true } },
            ],
        } as unknown as OperationTripsDto;
        const base = 63 + 2 * 32;

        const heightWith = (links: object[]) => {
            createComponent();
            OperationTableStore.setItineraryLinks(links as never);
            fixture.detectChanges();
            return component.placeholderHeight(operationTrip);
        };

        afterEach(() => OperationTableStore.setItineraryLinks([]));

        it('つながりが無ければ増えない', () => {
            expect(heightWith([])).toBe(base);
        });

        it('頭は 24px 増える', () => {
            expect(
                heightWith([
                    {
                        tripId: 't1',
                        operationId: 'op-1',
                        previous: end({}),
                        next: null,
                    },
                ]),
            ).toBe(base + 24);
        });

        it('末尾は 24px 増える', () => {
            expect(
                heightWith([
                    {
                        tripId: 't2',
                        operationId: 'op-1',
                        previous: null,
                        next: end({}),
                    },
                ]),
            ).toBe(base + 24);
        });

        it('列車の途中の切り替えは 1 件ごとに 20px 増える', () => {
            expect(
                heightWith([
                    {
                        tripId: 't1',
                        operationId: 'op-1',
                        previous: null,
                        next: end({ rule: 1 }),
                    },
                    {
                        tripId: 't2',
                        operationId: 'op-1',
                        previous: null,
                        next: end({ rule: 1 }),
                    },
                ]),
            ).toBe(base + 40);
        });
    });

    it('isCardVisible: 選択した群の運用だけを出す', () => {
        OperationTableStore.setSelectedGroupNames(['7群']);
        createComponent();

        expect(component.isCardVisible('79')).toBe(true);
        expect(component.isCardVisible('11')).toBe(false);
    });
});

describe('OperationTableComponent の読み込み中', () => {
    let fixture: ComponentFixture<OperationTableComponent>;
    let trips$: Subject<undefined>;

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const query = (selector: string) =>
        (fixture.nativeElement as HTMLElement).querySelector(selector);

    beforeEach(async () => {
        trips$ = new Subject<undefined>();
        await TestBed.configureTestingModule({
            imports: [OperationTableComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            convertToParamMap({ calendar_id: 'cal-1' }),
                        ),
                    },
                },
                {
                    provide: OperationTableService,
                    useValue: {
                        fetchCalendar: () => of(undefined),
                        fetchOperationTrips: () => trips$,
                        fetchStations: () => of(undefined),
                        fetchTripClasses: () => of(undefined),
                        fetchItineraryLinks: () => of(undefined),
                    },
                },
                {
                    provide: CalendarListState,
                    useValue: { calendars: signal([]) },
                },
                {
                    provide: TodaysCalendarListStateQuery,
                    useValue: { todaysCalendarId: 'cal-1' },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
            ],
        })
            .overrideComponent(OperationTableComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
    });

    afterEach(() => {
        fixture.destroy();
        OperationTableStore.setOperationTrips([]);
        OperationTableStore.setCalendar(null as never);
        OperationTableStore.setHasFetchedOperationTrips(false);
        OperationTableStore.resetLoading();
    });

    const finishFetch = async () => {
        trips$.next(undefined);
        trips$.complete();
        await flush();
        fixture.detectChanges();
    };

    it('取り終わるまでは骨組みを出し、空表示もカードも出さない', () => {
        fixture = TestBed.createComponent(OperationTableComponent);
        OperationTableStore.setCalendar({ calendarId: 'cal-1' } as never);
        fixture.detectChanges();

        expect(
            query('[data-testid="operation-table-skeleton"]'),
        ).not.toBeNull();
        expect(query('app-empty-state')).toBeNull();
        expect(query('app-operation-table-card')).toBeNull();
    });

    it('取り終えたら骨組みを消す', async () => {
        fixture = TestBed.createComponent(OperationTableComponent);
        fixture.detectChanges();

        await finishFetch();

        expect(query('[data-testid="operation-table-skeleton"]')).toBeNull();
    });

    it('取り終えて 0 件なら空表示を出す', async () => {
        fixture = TestBed.createComponent(OperationTableComponent);
        fixture.detectChanges();
        OperationTableStore.setCalendar({ calendarId: 'cal-1' } as never);

        await finishFetch();

        expect(query('app-empty-state')).not.toBeNull();
    });

    it('描いたカードは、画面の外の描画を省き（content-visibility）、省く間の高さは場所取りと同じにする', async () => {
        const operationTrip = {
            operation: { operationNumber: '11', operationId: 'op-1' },
            trips: [
                {
                    trip: {
                        tripId: 't0',
                        tripDirection: 0,
                        depotIn: false,
                        depotOut: false,
                    },
                },
            ],
        } as unknown as OperationTripsDto;
        OperationTableStore.setOperationTrips([operationTrip]);
        fixture = TestBed.createComponent(OperationTableComponent);
        fixture.detectChanges();
        await finishFetch();

        const blocks = await fixture.getDeferBlocks();
        await blocks[0].render(DeferBlockState.Complete);
        fixture.detectChanges();

        const card = query('app-operation-table-card') as HTMLElement;
        expect(card.classList).toContain('[content-visibility:auto]');
        expect(card.style.getPropertyValue('contain-intrinsic-size')).toBe(
            `auto ${fixture.componentInstance.placeholderHeight(operationTrip)}px`,
        );
    });

    it('取得に失敗しても骨組みを消す（保存していたカードを出すため）', async () => {
        // fetchData() は失敗を投げ直す（既存の振る舞い）。コンストラクタは受け止めないので、
        // zone.js が未処理の拒否としてテストを落とす。ここだけ本物の fetchData の失敗を受け流す
        const original = OperationTableComponent.prototype.fetchData;
        const spy = jest
            .spyOn(OperationTableComponent.prototype, 'fetchData')
            .mockImplementation(function (this: OperationTableComponent) {
                return original.call(this).catch(() => undefined);
            });
        fixture = TestBed.createComponent(OperationTableComponent);
        fixture.detectChanges();

        trips$.error(new Error('offline'));
        await flush();
        fixture.detectChanges();
        spy.mockRestore();

        expect(query('[data-testid="operation-table-skeleton"]')).toBeNull();
    });

    it('取り直しが重なったとき、先に終わった古い取得は骨組みを消さない', async () => {
        fixture = TestBed.createComponent(OperationTableComponent);
        fixture.detectChanges();
        const firstTrips$ = trips$;
        const secondTrips$ = new Subject<undefined>();
        trips$ = secondTrips$;
        fixture.componentInstance.fetchData().catch(() => undefined);

        firstTrips$.next(undefined);
        firstTrips$.complete();
        await flush();
        fixture.detectChanges();
        expect(
            query('[data-testid="operation-table-skeleton"]'),
        ).not.toBeNull();

        secondTrips$.next(undefined);
        secondTrips$.complete();
        await flush();
        fixture.detectChanges();
        expect(query('[data-testid="operation-table-skeleton"]')).toBeNull();
    });

    it('取り直すときは骨組みに戻す（保存した古いフラグが残っていても）', () => {
        OperationTableStore.setHasFetchedOperationTrips(true);

        fixture = TestBed.createComponent(OperationTableComponent);
        fixture.detectChanges();

        expect(
            query('[data-testid="operation-table-skeleton"]'),
        ).not.toBeNull();
    });

    it('ページを離れてすぐ戻ったとき、前のインスタンスの取得が後から終わっても、新しい取得が終わるまで骨組みは消えない', async () => {
        fixture = TestBed.createComponent(OperationTableComponent);
        fixture.detectChanges();
        const previousTrips$ = trips$;
        fixture.destroy();
        trips$ = new Subject<undefined>();
        fixture = TestBed.createComponent(OperationTableComponent);
        fixture.detectChanges();

        previousTrips$.next(undefined);
        previousTrips$.complete();
        await flush();
        fixture.detectChanges();
        expect(
            query('[data-testid="operation-table-skeleton"]'),
        ).not.toBeNull();

        await finishFetch();
        expect(query('[data-testid="operation-table-skeleton"]')).toBeNull();
    });
});

describe('OperationTableComponent のサーバー', () => {
    const fetchCalendar = jest.fn(() => of(undefined));
    const addCacheTags = jest.fn();

    const setup = async (
        params: Record<string, string>,
        extraProviders: Provider[] = [],
    ) => {
        await TestBed.configureTestingModule({
            imports: [OperationTableComponent],
            providers: [
                provideRouter([]),
                { provide: PLATFORM_ID, useValue: 'server' },
                {
                    provide: ActivatedRoute,
                    useValue: { paramMap: of(convertToParamMap(params)) },
                },
                {
                    provide: OperationTableService,
                    useValue: {
                        fetchCalendar,
                        fetchOperationTrips: () => of(undefined),
                        fetchStations: () => of(undefined),
                        fetchTripClasses: () => of(undefined),
                        fetchItineraryLinks: () => of(undefined),
                    },
                },
                {
                    provide: CalendarListState,
                    useValue: { calendars: signal([]) },
                },
                {
                    provide: TodaysCalendarListStateQuery,
                    useValue: { todaysCalendarId: 'todays-calendar-id' },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
                ...extraProviders,
            ],
        })
            .overrideComponent(OperationTableComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
    };

    afterEach(() => {
        jest.clearAllMocks();
        OperationTableStore.setCalendarId(null);
        OperationTableStore.resetLoading();
    });

    it('サーバーではパラメータの足りない URL を補わず、取りにも行かない', async () => {
        await setup({});
        const navigateSpy = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);

        TestBed.createComponent(OperationTableComponent);

        expect(navigateSpy).not.toHaveBeenCalled();
        expect(fetchCalendar).not.toHaveBeenCalled();
    });

    it('サーバーではダイヤのタグを付ける', async () => {
        await setup({ calendar_id: 'cal-1' }, [
            {
                provide: SsrResponse,
                useValue: { addCacheTags, setCachePolicy: jest.fn() },
            },
        ]);

        TestBed.createComponent(OperationTableComponent);

        expect(addCacheTags).toHaveBeenCalledWith(['calendar:cal-1']);
        expect(fetchCalendar).toHaveBeenCalled();
    });
});

describe('OperationTableComponent の圏外の保存', () => {
    let fixture: ComponentFixture<OperationTableComponent>;
    let fetchDataSpy: jest.SpyInstance;
    let originalFetchData: OperationTableComponent['fetchData'];
    let calendar$: Observable<undefined>;
    let trips$: Observable<undefined>;
    let stations$: Observable<undefined>;
    let tripClasses$: Observable<undefined>;
    let links$: Observable<undefined>;
    const save = jest.fn(() => Promise.resolve());
    const restore = jest.fn();

    const calendar = { calendarId: 'cal-1' } as never;
    const operationTrips = [
        {
            operation: { operationId: 'op-1', operationNumber: '11' },
            trips: [],
        },
    ] as never;
    const itineraryLinks = [{ tripOperationListId: 'link-1' }] as never;
    const stations = [{ stationId: 'st-1' }] as never;
    const tripClasses = [{ tripClassId: 'class-1' }] as never;
    const conditions = { calendarId: 'cal-1' };

    const flush = () => new Promise((resolve) => setTimeout(resolve, 10));
    // 次のタスクで失敗する取得。すぐ失敗させると、Zone の Promise と async/await の順序の都合で
    // 「処理されない拒否」と見なされ、ComponentFixture が投げ直してしまう
    const failLater = (message: string) =>
        timer(0).pipe(switchMap(() => throwError(() => new Error(message))));

    const setup = async () => {
        // fetchData() は失敗を投げ直す（既存の振る舞い）。コンストラクタは受け止めないので、
        // 本物の fetchData の失敗だけ受け流す
        originalFetchData = OperationTableComponent.prototype.fetchData;
        const original = originalFetchData;
        fetchDataSpy = jest
            .spyOn(OperationTableComponent.prototype, 'fetchData')
            .mockImplementation(function (this: OperationTableComponent) {
                return original.call(this).catch(() => undefined);
            });
        await TestBed.configureTestingModule({
            imports: [OperationTableComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            convertToParamMap({ calendar_id: 'cal-1' }),
                        ),
                    },
                },
                {
                    provide: OperationTableService,
                    useValue: {
                        fetchCalendar: () => calendar$,
                        fetchOperationTrips: () => trips$,
                        fetchStations: () => stations$,
                        fetchTripClasses: () => tripClasses$,
                        fetchItineraryLinks: () => links$,
                    },
                },
                {
                    provide: CalendarListState,
                    useValue: { calendars: signal([]) },
                },
                {
                    provide: TodaysCalendarListStateQuery,
                    useValue: { todaysCalendarId: 'cal-1' },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
                { provide: OfflineSnapshots, useValue: { save, restore } },
            ],
        })
            .overrideComponent(OperationTableComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();
    };

    const succeedAll = () => {
        calendar$ = of(undefined);
        trips$ = of(undefined);
        stations$ = of(undefined);
        tripClasses$ = of(undefined);
        links$ = of(undefined);
    };

    // 取得は成功した形のストア（サービスの差し替えはストアへ書かないので、先に入れておく）
    const fillStore = () => {
        OperationTableStore.setCalendar(calendar);
        OperationTableStore.setOperationTrips(operationTrips);
        OperationTableStore.setItineraryLinks(itineraryLinks);
        OperationTableStore.setStations(stations);
        OperationTableStore.setTripClasses(tripClasses);
    };

    afterEach(() => {
        fetchDataSpy.mockRestore();
        fixture?.destroy();
        jest.clearAllMocks();
        restore.mockReset();
        OperationTableStore.setCalendar(null as never);
        OperationTableStore.setOperationTrips([]);
        OperationTableStore.setItineraryLinks([]);
        OperationTableStore.setStations([]);
        OperationTableStore.setTripClasses([]);
        OperationTableStore.setSelectedGroupNames([]);
        OperationTableStore.setCalendarId(null);
        OperationTableStore.setHasFetchedOperationTrips(false);
        OperationTableStore.resetLoading();
    });

    it('成功したら条件と中身を保存する', async () => {
        succeedAll();
        await setup();
        fillStore();

        fixture = TestBed.createComponent(OperationTableComponent);
        await flush();

        expect(save).toHaveBeenCalledWith({
            key: 'OperationTable',
            conditions,
            data: {
                calendar,
                operationTrips,
                itineraryLinks,
                stations,
                tripClasses,
            },
        });
        expect(restore).not.toHaveBeenCalled();
    });

    it('前後の運用の取得だけが失敗したときは、保存も戻しもしない', async () => {
        succeedAll();
        links$ = failLater('offline-links');
        await setup();
        fillStore();

        fixture = TestBed.createComponent(OperationTableComponent);
        await flush();

        expect(save).not.toHaveBeenCalled();
        expect(restore).not.toHaveBeenCalled();
        expect(fixture.componentInstance.isLoading()).toBe(false);
    });

    it('失敗したら保存した中身を、読み込み中を解く前に戻す', async () => {
        succeedAll();
        trips$ = failLater('offline');
        await setup();
        let isLoadingWhenRestored: boolean | undefined;
        restore.mockImplementation(
            (params: { apply: (data: unknown, savedAt: number) => void }) => {
                isLoadingWhenRestored = fixture.componentInstance.isLoading();
                params.apply(
                    {
                        calendar,
                        operationTrips,
                        itineraryLinks,
                        stations,
                        tripClasses,
                    },
                    0,
                );
                return Promise.resolve(null);
            },
        );

        fixture = TestBed.createComponent(OperationTableComponent);
        await flush();

        expect(save).not.toHaveBeenCalled();
        expect(restore).toHaveBeenCalledWith({
            key: 'OperationTable',
            conditions,
            apply: expect.any(Function),
        });
        expect(isLoadingWhenRestored).toBe(true);
        expect(await firstValueFrom(OperationTableStore.calendar$)).toEqual(
            calendar,
        );
        expect(OperationTableStore.operations).toEqual(operationTrips);
        expect(
            await firstValueFrom(OperationTableStore.itineraryLinks$),
        ).toEqual(itineraryLinks);
        expect(await firstValueFrom(OperationTableStore.stations$)).toEqual(
            stations,
        );
        expect(await firstValueFrom(OperationTableStore.tripClasses$)).toEqual(
            tripClasses,
        );
        expect(fixture.componentInstance.isLoading()).toBe(false);
    });

    it('片方が先に失敗しても、残りの取得（前後の運用を含む）が終わってから戻す', async () => {
        const stationsLate = new Subject<undefined>();
        const linksLate = new Subject<undefined>();
        succeedAll();
        trips$ = failLater('offline');
        stations$ = stationsLate;
        links$ = linksLate;
        await setup();

        fixture = TestBed.createComponent(OperationTableComponent);
        await flush();
        expect(restore).not.toHaveBeenCalled();

        stationsLate.next(undefined);
        stationsLate.complete();
        await flush();
        expect(restore).not.toHaveBeenCalled();

        linksLate.next(undefined);
        linksLate.complete();
        await flush();

        expect(restore).toHaveBeenCalledTimes(1);
        expect(save).not.toHaveBeenCalled();
    });

    it('古い取得が失敗しても、保存した中身は戻さない', async () => {
        succeedAll();
        trips$ = failLater('offline-first');
        await setup();
        fixture = TestBed.createComponent(OperationTableComponent);

        // 取り直しを始めてから、先の取得の失敗が届く
        trips$ = of(undefined);
        await fixture.componentInstance.fetchData();
        await flush();

        expect(restore).not.toHaveBeenCalled();
    });

    it('戻す処理が壊れていても、読み込み中を解き、取得の失敗を投げる', async () => {
        succeedAll();
        trips$ = failLater('offline');
        await setup();
        restore.mockRejectedValue(new Error('broken snapshot'));
        fixture = TestBed.createComponent(OperationTableComponent);
        // コンストラクタの取得の失敗は受け流す
        await flush();

        trips$ = failLater('offline-again');
        await expect(
            originalFetchData.call(fixture.componentInstance),
        ).rejects.toThrow('offline-again');

        expect(restore).toHaveBeenCalled();
        expect(fixture.componentInstance.isLoading()).toBe(false);
    });
});

describe('pickOperationTableSettings', () => {
    it('丸ごと保存の古い値を読み込んでも、運用群以外はストアに入らない', () => {
        const picked = pickOperationTableSettings({
            selectedGroupNames: ['1群'],
            operationTrips: [{ operation: { operationId: 'old' } }],
            calendar: { calendarId: 'old' },
            hasFetchedOperationTrips: true,
            loadingQueue: [true],
        } as never);

        expect(picked).toEqual({
            calendarId: null,
            calendar: null,
            operationTrips: [],
            itineraryLinks: [],
            stations: [],
            tripClasses: [],
            selectedGroupNames: ['1群'],
            hasFetchedOperationTrips: false,
            loadingQueue: [],
        });
    });
});
