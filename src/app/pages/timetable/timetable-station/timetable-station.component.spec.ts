import { provideHttpClient, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA, PLATFORM_ID, Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
    Router,
} from '@angular/router';
import {
    BehaviorSubject,
    Observable,
    Subject,
    of,
    switchMap,
    throwError,
    timer,
} from 'rxjs';

import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { NotificationService } from 'src/app/core/services/notification.service';
import { PageNotFound } from 'src/app/core/page-not-found/page-not-found';
import { PageMeta } from 'src/app/core/ssr/page-meta';
import { SsrResponse } from 'src/app/core/ssr/ssr-response';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { OperationPostCardService } from 'src/app/shared/operation-post-card/operation-post-card.service';
import { setTodaysCalendars } from 'src/app/global-states/testing/set-todays-calendars';
import { TodaysCalendarListState } from 'src/app/global-states/todays-calendar-list.state';
import { TimetableStationService } from './services/timetable-station.service';
import { TimetableStationStore } from './stores/timetable-station.store';
import {
    ALL_LINE_OPTION,
    TimetableStationComponent,
} from './timetable-station.component';
import { LazyOptionsDirective } from 'src/app/shared/lazy-options/lazy-options.directive';

describe('TimetableStationComponent', () => {
    let component: TimetableStationComponent;
    let fixture: ComponentFixture<TimetableStationComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableStationComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([]),
                // 本物のサービスだと localhost:3000 へ実際に取りに行き、失敗が後ろのテストに漏れる
                {
                    provide: TimetableStationService,
                    useValue: {
                        fetchCalendar: () => of(undefined),
                        fetchTrips: () => of(undefined),
                        fetchTripClasses: () => of(undefined),
                        fetchStations: () => of(undefined),
                        fetchOperations: () => of(undefined),
                        fetchOperationSightingTimeCrossSections: () =>
                            of(undefined),
                    },
                },
                {
                    provide: NotificationService,
                    useValue: { open: () => {} },
                },
            ],
        })
            .overrideComponent(TimetableStationComponent, {
                set: {
                    imports: [LazyOptionsDirective],
                    schemas: [NO_ERRORS_SCHEMA],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableStationComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

describe('TimetableStationComponent の URL の値', () => {
    const CALENDAR = '00000000-0000-4000-8000-000000000001';
    const STATION = '00000000-0000-4000-8000-0000000000a1';
    const UNKNOWN_STATION = '00000000-0000-4000-8000-0000000000ff';
    const TODAY = '00000000-0000-4000-8000-0000000000dd';

    const mark = jest.fn();
    const clear = jest.fn();
    const setTitle = jest.fn();
    const fetchCalendar = jest.fn((): Observable<boolean> => of(true));
    const fetchTrips = jest.fn(() => of(undefined));
    let params$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
    let navigate: jest.SpyInstance;

    async function create(
        params: Record<string, string>,
        options: { stations?: { stationId: string }[] } = {},
    ): Promise<ComponentFixture<TimetableStationComponent>> {
        params$ = new BehaviorSubject(convertToParamMap(params));
        const ok = () => of(undefined);
        await TestBed.configureTestingModule({
            imports: [TimetableStationComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: params$ } },
                { provide: PageNotFound, useValue: { mark, clear } },
                { provide: PageMeta, useValue: { setTitle } },
                {
                    provide: RouteStationListState,
                    useValue: {
                        stations: () =>
                            options.stations ?? [
                                { stationId: STATION, stationName: '横浜' },
                            ],
                        routeStations: () => [],
                        operatingSystemEndsByRouteId: () => ({}),
                    },
                },
                {
                    provide: TodaysCalendarListState,
                    useValue: {
                        todaysCalendarId: () => TODAY,
                        todaysCalendarIds: () => [TODAY],
                    },
                },
                {
                    provide: TimetableStationService,
                    useValue: {
                        fetchCalendar,
                        fetchTrips,
                        fetchTripClasses: ok,
                        fetchStations: ok,
                        fetchOperations: ok,
                        fetchOperationSightingTimeCrossSections: ok,
                    },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
            ],
        })
            .overrideComponent(TimetableStationComponent, {
                set: {
                    imports: [LazyOptionsDirective],
                    schemas: [NO_ERRORS_SCHEMA],
                },
            })
            .compileComponents();
        navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
        const fixture = TestBed.createComponent(TimetableStationComponent);
        fixture.detectChanges();
        await flush();
        fixture.detectChanges();
        return fixture;
    }

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const hasNotFound = (f: ComponentFixture<unknown>) =>
        f.nativeElement.querySelector('app-not-found-content') !== null;
    const hasStationTable = (f: ComponentFixture<unknown>) =>
        f.nativeElement.querySelector('app-timetable-station-table') !== null;
    const hasBody = (f: ComponentFixture<unknown>) =>
        f.nativeElement.querySelector('app-control-band') !== null;

    afterEach(() => {
        jest.clearAllMocks();
        fetchCalendar.mockImplementation(() => of(true));
    });

    // Angular は matrix の値の undefined を "undefined" と書く（2026-11-07 の本番で 422）
    it.each([
        { calendar_id: 'undefined', station_id: STATION, trip_direction: '0' },
        { calendar_id: CALENDAR, station_id: 'undefined', trip_direction: '0' },
        { calendar_id: CALENDAR, station_id: STATION, trip_direction: 'abc' },
        { calendar_id: CALENDAR, station_id: STATION, trip_direction: '2' },
        { calendar_id: CALENDAR, station_id: STATION, trip_direction: '' },
        {
            calendar_id: CALENDAR,
            station_id: UNKNOWN_STATION,
            trip_direction: '0',
        },
    ])('%j は見つからない表示にして、補いも取得もしない', async (params) => {
        const fixture = await create(params);

        expect(mark).toHaveBeenCalledTimes(1);
        expect(fetchCalendar).not.toHaveBeenCalled();
        expect(fetchTrips).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(true);
        expect(hasBody(fixture)).toBe(true); // 操作帯は残す
        expect(hasStationTable(fixture)).toBe(false);
    });

    it('不正な URL から正しい URL へ戻ったら、見つからない題名を捨ててから、詳しい題名を入れ直す', async () => {
        const fixture = await create({
            calendar_id: 'undefined',
            station_id: STATION,
            trip_direction: '0',
        });
        expect(mark).toHaveBeenCalledTimes(1);
        expect(clear).not.toHaveBeenCalled();
        setTitle.mockClear();

        params$.next(
            convertToParamMap({
                calendar_id: CALENDAR,
                station_id: STATION,
                trip_direction: '0',
            }),
        );
        await flush();
        fixture.detectChanges();

        expect(clear).toHaveBeenCalledTimes(1);
        expect(hasNotFound(fixture)).toBe(false);
        // effect の setTitle は clear より後（clear が詳しい題名を消さない）
        expect(setTitle).toHaveBeenCalled();
        expect(clear.mock.invocationCallOrder[0]).toBeLessThan(
            setTitle.mock.invocationCallOrder[0],
        );
    });

    it('駅の一覧が空のときは、駅の存在で決めない（読み込みの失敗と区別できない）', async () => {
        const fixture = await create(
            {
                calendar_id: CALENDAR,
                station_id: UNKNOWN_STATION,
                trip_direction: '0',
            },
            { stations: [] },
        );

        expect(mark).not.toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(false);
        expect(fetchCalendar).toHaveBeenCalled();
    });

    it('向きが無い URL は、今までどおり上りに置き換える', async () => {
        const fixture = await create({
            calendar_id: CALENDAR,
            station_id: STATION,
        });

        expect(mark).not.toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(false);
        expect(navigate).toHaveBeenCalledWith(
            [
                'timetable',
                'station',
                {
                    calendar_id: CALENDAR,
                    station_id: STATION,
                    trip_direction: '0',
                },
            ],
            { replaceUrl: true },
        );
    });

    it('ダイヤが無い URL は、今までどおり今日のダイヤに置き換える', async () => {
        await create({ station_id: STATION, trip_direction: '1' });

        expect(mark).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith(
            [
                'timetable',
                'station',
                {
                    calendar_id: TODAY,
                    station_id: STATION,
                    trip_direction: '1',
                },
            ],
            { replaceUrl: true },
        );
    });

    it('値が全部正しければ、見つからない表示にせず取得する', async () => {
        const fixture = await create({
            calendar_id: CALENDAR,
            station_id: STATION,
            trip_direction: '1',
        });

        expect(mark).not.toHaveBeenCalled();
        expect(fetchCalendar).toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(false);
        expect(hasBody(fixture)).toBe(true);
    });

    it('存在しないダイヤ（api が null を返す）は、取得のあとで見つからない表示にする', async () => {
        fetchCalendar.mockImplementation(() => of(false));
        const fixture = await create({
            calendar_id: CALENDAR,
            station_id: STATION,
            trip_direction: '0',
        });

        expect(mark).toHaveBeenCalledTimes(1);
        expect(hasNotFound(fixture)).toBe(true);
        expect(hasBody(fixture)).toBe(true); // 操作帯は残す
        expect(hasStationTable(fixture)).toBe(false);
    });

    it('ダイヤの取得の失敗（5xx・通信の失敗）は見つからない表示にせず、今までどおり失敗として扱う', async () => {
        fetchCalendar.mockImplementation(() =>
            throwError(() => new Error('500')),
        );
        // fetchData() は失敗を投げ直す（既存の振る舞い）。本物の失敗だけ受け流す
        const original = TimetableStationComponent.prototype.fetchData;
        const spy = jest
            .spyOn(TimetableStationComponent.prototype, 'fetchData')
            .mockImplementation(function (this: TimetableStationComponent) {
                return original.call(this).catch(() => undefined);
            });
        const fixture = await create({
            calendar_id: CALENDAR,
            station_id: STATION,
            trip_direction: '0',
        });

        spy.mockRestore();

        expect(mark).not.toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(false);
        expect(hasBody(fixture)).toBe(true);
    });

    it('前の URL の「無い」が遅れて届いても、今の正しい URL を見つからない表示にしない', async () => {
        const first$ = new Subject<boolean>();
        fetchCalendar.mockImplementationOnce(() => first$);
        const fixture = await create({
            calendar_id: CALENDAR,
            station_id: STATION,
            trip_direction: '0',
        });

        params$.next(
            convertToParamMap({
                calendar_id: CALENDAR,
                station_id: STATION,
                trip_direction: '1',
            }),
        );
        await flush();
        first$.next(false);
        first$.complete();
        await flush();
        fixture.detectChanges();

        expect(mark).not.toHaveBeenCalled();
        expect(hasNotFound(fixture)).toBe(false);
        expect(hasBody(fixture)).toBe(true);
    });

    it('見つからない表示の操作帯でダイヤを選ぶと Router で遷移し、読み込みの帯は出さない', async () => {
        const fixture = await create({
            calendar_id: CALENDAR,
            station_id: 'undefined',
            trip_direction: '0',
        });
        navigate.mockClear();

        fixture.componentInstance.onCalendarChange(
            '99999999-2222-3333-4444-555555555555',
        );

        expect(navigate).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(navigate.mock.calls[0][0])).not.toContain(
            'undefined',
        );
        expect(
            fixture.nativeElement.querySelector('mat-progress-bar'),
        ).toBeNull();
    });

    it('見つからない表示から正しい URL へ移ると、本体に戻って取得し題名も付け直す', async () => {
        const fixture = await create({
            calendar_id: CALENDAR,
            station_id: 'undefined',
            trip_direction: '0',
        });
        expect(hasNotFound(fixture)).toBe(true);
        setTitle.mockClear();

        params$.next(
            convertToParamMap({
                calendar_id: CALENDAR,
                station_id: STATION,
                trip_direction: '0',
            }),
        );
        await flush();
        fixture.detectChanges();

        expect(hasNotFound(fixture)).toBe(false);
        expect(hasBody(fixture)).toBe(true);
        expect(fetchCalendar).toHaveBeenCalled();
        expect(setTitle).toHaveBeenCalledWith(
            expect.stringContaining('時刻表'),
        );
    });

    it('見つからない表示のとき、題名を上書きしない', async () => {
        await create({
            calendar_id: CALENDAR,
            station_id: 'undefined',
            trip_direction: '0',
        });
        TestBed.inject(TimetableStationStore).setTripDirection(1);
        TestBed.tick();

        expect(setTitle).not.toHaveBeenCalled();
    });

    it('見つからない表示のとき、読み込みの帯は出さない', async () => {
        const fixture = await create({
            calendar_id: CALENDAR,
            station_id: 'undefined',
            trip_direction: '0',
        });
        TestBed.inject(TimetableStationStore).enableLoading();
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelector('mat-progress-bar'),
        ).toBeNull();
    });
});

describe('TimetableStationComponent の読み込み中', () => {
    let fixture: ComponentFixture<TimetableStationComponent>;
    let calendar$: Subject<undefined>;
    let fetchDataSpy: jest.SpyInstance;

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const query = (selector: string) =>
        (fixture.nativeElement as HTMLElement).querySelector(selector);

    beforeEach(async () => {
        // fetchData() は失敗を投げ直す（既存の振る舞い）。コンストラクタは受け止めないので、
        // 未処理の拒否としてテストを落とす。ここでは本物の fetchData の失敗だけ受け流す
        const original = TimetableStationComponent.prototype.fetchData;
        fetchDataSpy = jest
            .spyOn(TimetableStationComponent.prototype, 'fetchData')
            .mockImplementation(function (this: TimetableStationComponent) {
                return original.call(this).catch(() => undefined);
            });
        calendar$ = new Subject<undefined>();
        const ok = () => of(undefined);
        await TestBed.configureTestingModule({
            imports: [TimetableStationComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            convertToParamMap({
                                calendar_id:
                                    '00000000-0000-4000-8000-000000000001',
                                station_id:
                                    '00000000-0000-4000-8000-0000000000a1',
                                trip_direction: '0',
                            }),
                        ),
                    },
                },
                {
                    provide: TimetableStationService,
                    useValue: {
                        fetchCalendar: () => calendar$,
                        fetchTrips: ok,
                        fetchTripClasses: ok,
                        fetchStations: ok,
                        fetchOperations: ok,
                        fetchOperationSightingTimeCrossSections: ok,
                    },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
            ],
        })
            .overrideComponent(TimetableStationComponent, {
                set: {
                    imports: [LazyOptionsDirective],
                    schemas: [NO_ERRORS_SCHEMA],
                },
            })
            .compileComponents();
        fixture = TestBed.createComponent(TimetableStationComponent);
        fixture.detectChanges();
    });

    afterEach(() => {
        fetchDataSpy.mockRestore();
        fixture.destroy();
        TestBed.inject(TimetableStationStore).setTrips([]);
        TestBed.inject(TimetableStationStore).setHasFetchedTimetable(false);
        TestBed.inject(TimetableStationStore).resetLoading();
    });

    const finishFetch = async () => {
        calendar$.next(undefined);
        calendar$.complete();
        await flush();
        fixture.detectChanges();
    };

    it('取り終わるまでは時刻表の骨組みを出し、「この条件の列車情報はありません」を出さない', () => {
        TestBed.inject(TimetableStationStore).setCalendar({
            calendarId: '00000000-0000-4000-8000-000000000001',
        } as never);
        fixture.detectChanges();

        expect(
            query('[data-testid="timetable-station-skeleton"]'),
        ).not.toBeNull();
        expect(query('app-empty-state')).toBeNull();
    });

    it('取り終えて 0 件なら空表示を出す', async () => {
        TestBed.inject(TimetableStationStore).setCalendar({
            calendarId: '00000000-0000-4000-8000-000000000001',
        } as never);

        await finishFetch();

        expect(query('[data-testid="timetable-station-skeleton"]')).toBeNull();
        expect(query('app-empty-state')).not.toBeNull();
    });

    it('取得に失敗しても骨組みを消す', async () => {
        calendar$.error(new Error('offline'));
        await flush();
        fixture.detectChanges();

        expect(query('[data-testid="timetable-station-skeleton"]')).toBeNull();
    });

    it('取り直しが重なったとき、先に終わった古い取得は骨組みを消さない', async () => {
        const firstCalendar$ = calendar$;
        const secondCalendar$ = new Subject<undefined>();
        calendar$ = secondCalendar$;
        fixture.componentInstance.fetchData().catch(() => undefined);

        firstCalendar$.next(undefined);
        firstCalendar$.complete();
        await flush();
        fixture.detectChanges();
        expect(
            query('[data-testid="timetable-station-skeleton"]'),
        ).not.toBeNull();

        secondCalendar$.next(undefined);
        secondCalendar$.complete();
        await flush();
        fixture.detectChanges();
        expect(query('[data-testid="timetable-station-skeleton"]')).toBeNull();
    });

    it('駅・ダイヤ・方向を変えて取り直すときは骨組みに戻す', async () => {
        await finishFetch();

        calendar$ = new Subject<undefined>();
        fixture.componentInstance.fetchData().catch(() => undefined);
        fixture.detectChanges();

        expect(
            query('[data-testid="timetable-station-skeleton"]'),
        ).not.toBeNull();
    });

    it('ページを離れてすぐ戻ったとき、前のインスタンスの取得が後から終わっても、新しい取得が終わるまで骨組みは消えない', async () => {
        const previousCalendar$ = calendar$;
        fixture.destroy();
        calendar$ = new Subject<undefined>();
        fixture = TestBed.createComponent(TimetableStationComponent);
        fixture.detectChanges();

        previousCalendar$.next(undefined);
        previousCalendar$.complete();
        await flush();
        fixture.detectChanges();
        expect(
            query('[data-testid="timetable-station-skeleton"]'),
        ).not.toBeNull();

        await finishFetch();
        expect(query('[data-testid="timetable-station-skeleton"]')).toBeNull();
    });
});

describe('TimetableStationComponent の帯の操作', () => {
    let component: TimetableStationComponent;
    let navigate: jest.SpyInstance;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableStationComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            convertToParamMap({
                                calendar_id:
                                    '00000000-0000-4000-8000-000000000001',
                                station_id:
                                    '00000000-0000-4000-8000-0000000000a1',
                                trip_direction: '1',
                            }),
                        ),
                    },
                },
                {
                    provide: TimetableStationService,
                    useValue: {
                        fetchCalendar: () => of(undefined),
                        fetchTrips: () => of(undefined),
                        fetchTripClasses: () => of(undefined),
                        fetchStations: () => of(undefined),
                        fetchOperations: () => of(undefined),
                        fetchOperationSightingTimeCrossSections: () =>
                            of(undefined),
                    },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
            ],
        })
            .overrideComponent(TimetableStationComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();
        navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
        component = TestBed.createComponent(
            TimetableStationComponent,
        ).componentInstance;
        navigate.mockClear();
    });

    it('駅の選択欄で「全線」を選ぶと、同じダイヤ・方向で全線時刻表へ移る', () => {
        component.onStationChange(ALL_LINE_OPTION);
        expect(navigate).toHaveBeenCalledWith([
            'timetable',
            'all-line',
            {
                calendar_id: '00000000-0000-4000-8000-000000000001',
                trip_direction: 1,
            },
        ]);
    });

    it('前後の駅へ送ると、ダイヤ・方向を引き継いで駅だけ替える', () => {
        component.onStep({
            id: '00000000-0000-4000-8000-0000000000a2',
            label: '希望ヶ丘',
        });
        expect(navigate).toHaveBeenCalledWith([
            'timetable',
            'station',
            {
                calendar_id: '00000000-0000-4000-8000-000000000001',
                station_id: '00000000-0000-4000-8000-0000000000a2',
                trip_direction: 1,
            },
        ]);
    });
});

describe('TimetableStationComponent のサーバー', () => {
    const fetchCalendar = jest.fn(() => of(undefined));
    const addCacheTags = jest.fn();

    const setup = async (
        params: Record<string, string>,
        extraProviders: Provider[] = [],
    ) => {
        await TestBed.configureTestingModule({
            imports: [TimetableStationComponent],
            providers: [
                provideRouter([]),
                { provide: PLATFORM_ID, useValue: 'server' },
                {
                    provide: ActivatedRoute,
                    useValue: { paramMap: of(convertToParamMap(params)) },
                },
                {
                    provide: TimetableStationService,
                    useValue: {
                        fetchCalendar,
                        fetchTrips: () => of(undefined),
                        fetchTripClasses: () => of(undefined),
                        fetchStations: () => of(undefined),
                        fetchOperations: () => of(undefined),
                        fetchOperationSightingTimeCrossSections: () =>
                            of(undefined),
                    },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
                ...extraProviders,
            ],
        })
            .overrideComponent(TimetableStationComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();
    };

    afterEach(() => {
        jest.clearAllMocks();
        TestBed.inject(TimetableStationStore).resetLoading();
    });

    it('サーバーではパラメータの足りない URL を補わず、取りにも行かない', async () => {
        await setup({});
        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);

        TestBed.createComponent(TimetableStationComponent);

        expect(navigate).not.toHaveBeenCalled();
        expect(fetchCalendar).not.toHaveBeenCalled();
    });

    it('サーバーではダイヤのタグを付ける', async () => {
        await setup(
            {
                calendar_id: '00000000-0000-4000-8000-000000000001',
                station_id: '00000000-0000-4000-8000-0000000000a1',
                trip_direction: '0',
            },
            [
                {
                    provide: SsrResponse,
                    useValue: { addCacheTags, setCachePolicy: jest.fn() },
                },
            ],
        );

        TestBed.createComponent(TimetableStationComponent);

        expect(addCacheTags).toHaveBeenCalledWith([
            'calendar:00000000-0000-4000-8000-000000000001',
        ]);
        expect(fetchCalendar).toHaveBeenCalled();
    });

    it('サーバーでは今日のダイヤでも充当編成を出さない（ブラウザの最初の描画と形をそろえる）', async () => {
        await setup(
            {
                calendar_id: '00000000-0000-4000-8000-000000000001',
                station_id: '00000000-0000-4000-8000-0000000000a1',
                trip_direction: '0',
            },
            [
                {
                    provide: SsrResponse,
                    useValue: { addCacheTags, setCachePolicy: jest.fn() },
                },
            ],
        );
        setTodaysCalendars(['00000000-0000-4000-8000-000000000001']);

        const component = TestBed.createComponent(
            TimetableStationComponent,
        ).componentInstance;

        expect(component.isTodaysCalendar()).toBe(true);
        expect(component.showCurrentFormation()).toBe(false);
    });
});

describe('TimetableStationComponent の圏外の保存', () => {
    let fixture: ComponentFixture<TimetableStationComponent>;
    let fetchDataSpy: jest.SpyInstance;
    let originalFetchData: TimetableStationComponent['fetchData'];
    let trips$: Observable<undefined>;
    let operations$: Observable<undefined> = of(undefined);
    const save = jest.fn(() => Promise.resolve());
    const restore = jest.fn();

    const calendar = {
        calendarId: '00000000-0000-4000-8000-000000000001',
    } as never;
    const trips = [{ tripId: 'trip-1' }] as never;
    const tripBlocks = [{ tripBlockId: 'block-1' }] as never;
    const tripClasses = [{ tripClassId: 'class-1' }] as never;
    const stations = [
        { stationId: '00000000-0000-4000-8000-0000000000a1' },
    ] as never;
    const operations = [{ operationId: 'op-1' }] as never;
    const conditions = {
        calendarId: '00000000-0000-4000-8000-000000000001',
        stationId: '00000000-0000-4000-8000-0000000000a1',
        tripDirection: 0,
    };

    const flush = () => new Promise((resolve) => setTimeout(resolve, 10));
    // 次のタスクで失敗する取得。すぐ失敗させると、Zone の Promise と async/await の順序の都合で
    // 「処理されない拒否」と見なされ、ComponentFixture が投げ直してしまう
    const failLater = (message: string) =>
        timer(0).pipe(switchMap(() => throwError(() => new Error(message))));

    const setup = async () => {
        // fetchData() は失敗を投げ直す（既存の振る舞い）。コンストラクタは受け止めないので、
        // 本物の fetchData の失敗だけ受け流す
        originalFetchData = TimetableStationComponent.prototype.fetchData;
        const original = originalFetchData;
        fetchDataSpy = jest
            .spyOn(TimetableStationComponent.prototype, 'fetchData')
            .mockImplementation(function (this: TimetableStationComponent) {
                return original.call(this).catch(() => undefined);
            });
        const ok = () => of(undefined);
        await TestBed.configureTestingModule({
            imports: [TimetableStationComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            convertToParamMap({
                                calendar_id:
                                    '00000000-0000-4000-8000-000000000001',
                                station_id:
                                    '00000000-0000-4000-8000-0000000000a1',
                                trip_direction: '0',
                            }),
                        ),
                    },
                },
                {
                    provide: TimetableStationService,
                    useValue: {
                        fetchCalendar: ok,
                        fetchTrips: () => trips$,
                        fetchTripClasses: ok,
                        fetchStations: ok,
                        fetchOperations: () => operations$,
                        fetchOperationSightingTimeCrossSections: ok,
                    },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
                { provide: OfflineSnapshots, useValue: { save, restore } },
            ],
        })
            .overrideComponent(TimetableStationComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();
    };

    const fillStore = () => {
        const store = TestBed.inject(TimetableStationStore);
        store.setCalendar(calendar);
        store.setTrips(trips);
        store.setTripBlocks(tripBlocks);
        store.setTripClasses(tripClasses);
        store.setStations(stations);
        store.setOperations(operations);
    };

    const emptyStore = () => {
        const store = TestBed.inject(TimetableStationStore);
        store.setCalendar(null as never);
        store.setTrips([]);
        store.setTripBlocks([]);
        store.setTripClasses([]);
        store.setStations([]);
        store.setOperations([]);
    };

    afterEach(() => {
        operations$ = of(undefined);
        fetchDataSpy.mockRestore();
        fixture.destroy();
        jest.clearAllMocks();
        restore.mockReset();
        emptyStore();
        TestBed.inject(TimetableStationStore).setHasFetchedTimetable(false);
        TestBed.inject(TimetableStationStore).resetLoading();
    });

    it('成功したら条件と中身を保存する', async () => {
        trips$ = of(undefined);
        await setup();
        fillStore();

        fixture = TestBed.createComponent(TimetableStationComponent);
        await flush();

        expect(save).toHaveBeenCalledWith({
            key: 'TimetableStation',
            conditions,
            data: {
                calendar,
                trips,
                tripBlocks,
                tripClasses,
                stations,
                operations,
            },
        });
        expect(restore).not.toHaveBeenCalled();
    });

    it('失敗したら保存した中身を、読み込み中を解く前に戻す', async () => {
        trips$ = failLater('offline');
        await setup();
        let isLoadingWhenRestored: boolean | undefined;
        restore.mockImplementation(
            (params: { apply: (data: unknown, savedAt: number) => void }) => {
                isLoadingWhenRestored = fixture.componentInstance.isLoading();
                params.apply(
                    {
                        calendar,
                        trips,
                        tripBlocks,
                        tripClasses,
                        stations,
                        operations,
                    },
                    0,
                );
                return Promise.resolve(null);
            },
        );

        fixture = TestBed.createComponent(TimetableStationComponent);
        await flush();

        expect(save).not.toHaveBeenCalled();
        expect(restore).toHaveBeenCalledWith({
            key: 'TimetableStation',
            conditions,
            apply: expect.any(Function),
        });
        expect(isLoadingWhenRestored).toBe(true);
        expect(TestBed.inject(TimetableStationStore).snapshot()).toEqual({
            calendar,
            trips,
            tripBlocks,
            tripClasses,
            stations,
            operations,
        });
        expect(fixture.componentInstance.isLoading()).toBe(false);
        expect(fixture.componentInstance.hasFetchedTimetable()).toBe(true);
    });

    it('古い取得が失敗しても、保存した中身は戻さない', async () => {
        trips$ = failLater('offline-first');
        await setup();
        fixture = TestBed.createComponent(TimetableStationComponent);

        // 取り直しを始めてから、先の取得の失敗が届く
        trips$ = of(undefined);
        await fixture.componentInstance.fetchData();
        await flush();

        expect(restore).not.toHaveBeenCalled();
    });

    it('片方が先に失敗しても、遅い方が終わるまで保存した中身を戻さない', async () => {
        trips$ = failLater('offline');
        // 先に失敗した取得より遅く終わる取得
        operations$ = timer(50).pipe(switchMap(() => of(undefined)));
        await setup();

        fixture = TestBed.createComponent(TimetableStationComponent);
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(restore).not.toHaveBeenCalled();

        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(restore).toHaveBeenCalledTimes(1);
        expect(fixture.componentInstance.isLoading()).toBe(false);
    });

    it('戻す処理が壊れていても読み込みを解く', async () => {
        trips$ = failLater('offline');
        await setup();
        restore.mockRejectedValue(new Error('restore broken'));

        fixture = TestBed.createComponent(TimetableStationComponent);
        await flush();

        expect(restore).toHaveBeenCalledTimes(1);
        expect(fixture.componentInstance.isLoading()).toBe(false);
        expect(fixture.componentInstance.hasFetchedTimetable()).toBe(true);
    });

    it('戻す処理が壊れていても、元の取得の失敗を投げ直す', async () => {
        trips$ = failLater('offline');
        await setup();
        restore.mockRejectedValue(new Error('restore broken'));

        fixture = TestBed.createComponent(TimetableStationComponent);
        await flush();

        // コンストラクタの取得は失敗を受け流すので、本物の fetchData を直接呼んで確かめる
        await expect(
            originalFetchData.call(fixture.componentInstance),
        ).rejects.toThrow('offline');

        expect(restore).toHaveBeenCalled();
        expect(fixture.componentInstance.isLoading()).toBe(false);
        expect(fixture.componentInstance.hasFetchedTimetable()).toBe(true);
    });
});

describe('TimetableStationComponent の投稿後の取り直し', () => {
    const calendarId = '00000000-0000-4000-8000-000000000001';
    const open = jest.fn();
    const fetchTrips = jest.fn(() => of(undefined));
    const fetchSightings = jest.fn<Observable<boolean>, []>(() => of(true));
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    const setup = async (todayIds: string[]) => {
        const ok = () => of(undefined);
        await TestBed.configureTestingModule({
            imports: [TimetableStationComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            convertToParamMap({
                                calendar_id: calendarId,
                                station_id:
                                    '00000000-0000-4000-8000-0000000000a1',
                                trip_direction: '0',
                            }),
                        ),
                    },
                },
                {
                    provide: TimetableStationService,
                    useValue: {
                        fetchCalendar: ok,
                        fetchTrips,
                        fetchTripClasses: ok,
                        fetchStations: ok,
                        fetchOperations: ok,
                        fetchOperationSightingTimeCrossSections: fetchSightings,
                    },
                },
                { provide: NotificationService, useValue: { open } },
                {
                    provide: OfflineSnapshots,
                    useValue: { save: jest.fn(), restore: jest.fn() },
                },
            ],
        })
            .overrideComponent(TimetableStationComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();
        setTodaysCalendars(todayIds);
        const fixture = TestBed.createComponent(TimetableStationComponent);
        await flush();
        // 作ったときの取得を数えないようにする
        jest.clearAllMocks();
        return fixture;
    };

    afterEach(() => {
        jest.clearAllMocks();
        fetchSightings.mockImplementation(() => of(true));
        TestBed.inject(TimetableStationStore).resetLoading();
    });

    it('投稿されたら充当編成だけを 1 回取り直し、時刻表は取り直さない', async () => {
        const fixture = await setup([calendarId]);

        TestBed.inject(OperationPostCardService).emitSubmitEvent();
        await flush();

        expect(fetchSightings).toHaveBeenCalledTimes(1);
        expect(fetchTrips).not.toHaveBeenCalled();
        expect(open).not.toHaveBeenCalled();
        fixture.destroy();
    });

    it('今日のダイヤでなければ何も取らない', async () => {
        const fixture = await setup([]);

        TestBed.inject(OperationPostCardService).emitSubmitEvent();
        await flush();

        expect(fetchSightings).not.toHaveBeenCalled();
        expect(fetchTrips).not.toHaveBeenCalled();
        fixture.destroy();
    });

    it('取得に失敗したら通知を出し、投げない', async () => {
        const fixture = await setup([calendarId]);
        const consoleError = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        fetchSightings.mockImplementation(() =>
            throwError(() => new Error('offline')),
        );

        TestBed.inject(OperationPostCardService).emitSubmitEvent();
        await flush();

        expect(open).toHaveBeenCalledWith('データの取得に失敗しました', 'OK');
        expect(TestBed.inject(TimetableStationStore).isLoading()).toBe(false);
        consoleError.mockRestore();
        fixture.destroy();
    });

    it('取れなかった（false）ときも通知を出す', async () => {
        const fixture = await setup([calendarId]);
        fetchSightings.mockImplementation(() => of(false));

        TestBed.inject(OperationPostCardService).emitSubmitEvent();
        await flush();

        expect(open).toHaveBeenCalledWith('データの取得に失敗しました', 'OK');
        fixture.destroy();
    });
});
