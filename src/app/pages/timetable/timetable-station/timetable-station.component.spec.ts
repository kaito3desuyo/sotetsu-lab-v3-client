import { provideHttpClient, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA, PLATFORM_ID, Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
    Router,
} from '@angular/router';
import { Observable, Subject, of, switchMap, throwError, timer } from 'rxjs';

import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { NotificationService } from 'src/app/core/services/notification.service';
import { SsrResponse } from 'src/app/core/ssr/ssr-response';
import { setTodaysCalendars } from 'src/app/global-states/testing/set-todays-calendars';
import { TimetableStationService } from './services/timetable-station.service';
import { TimetableStationStore } from './stores/timetable-station.store';
import {
    ALL_LINE_OPTION,
    TimetableStationComponent,
} from './timetable-station.component';

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
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableStationComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

describe('TimetableStationComponent の URL の向き', () => {
    it('向きが読めない URL は、無いときと同じく上りに置き換える', async () => {
        const params = {
            calendar_id: 'cal-1',
            station_id: 'st-1',
            trip_direction: 'abc',
        };
        await TestBed.configureTestingModule({
            imports: [TimetableStationComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: { paramMap: of(convertToParamMap(params)) },
                },
                { provide: TimetableStationService, useValue: {} },
                { provide: NotificationService, useValue: { open: () => {} } },
            ],
        })
            .overrideComponent(TimetableStationComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();
        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);

        TestBed.createComponent(TimetableStationComponent);

        expect(navigate).toHaveBeenCalledWith(
            [
                'timetable',
                'station',
                {
                    calendar_id: 'cal-1',
                    station_id: 'st-1',
                    trip_direction: '0',
                },
            ],
            { replaceUrl: true },
        );
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
        // zone.js が未処理の拒否としてテストを落とす。ここでは本物の fetchData の失敗だけ受け流す
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
                                calendar_id: 'cal-1',
                                station_id: 'st-1',
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
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
        fixture = TestBed.createComponent(TimetableStationComponent);
        fixture.detectChanges();
    });

    afterEach(() => {
        fetchDataSpy.mockRestore();
        fixture.destroy();
        TimetableStationStore.setTrips([]);
        TimetableStationStore.setHasFetchedTimetable(false);
        TimetableStationStore.resetLoading();
    });

    const finishFetch = async () => {
        calendar$.next(undefined);
        calendar$.complete();
        await flush();
        fixture.detectChanges();
    };

    it('取り終わるまでは時刻表の骨組みを出し、「この条件の列車情報はありません」を出さない', () => {
        TimetableStationStore.setCalendar({ calendarId: 'cal-1' } as never);
        fixture.detectChanges();

        expect(
            query('[data-testid="timetable-station-skeleton"]'),
        ).not.toBeNull();
        expect(query('app-empty-state')).toBeNull();
    });

    it('取り終えて 0 件なら空表示を出す', async () => {
        TimetableStationStore.setCalendar({ calendarId: 'cal-1' } as never);

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
                                calendar_id: 'cal-1',
                                station_id: 'st-1',
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
            { calendar_id: 'cal-1', trip_direction: 1 },
        ]);
    });

    it('前後の駅へ送ると、ダイヤ・方向を引き継いで駅だけ替える', () => {
        component.onStep({ id: 'st-2', label: '希望ヶ丘' });
        expect(navigate).toHaveBeenCalledWith([
            'timetable',
            'station',
            { calendar_id: 'cal-1', station_id: 'st-2', trip_direction: 1 },
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
        TimetableStationStore.resetLoading();
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
            { calendar_id: 'cal-1', station_id: 'st-1', trip_direction: '0' },
            [
                {
                    provide: SsrResponse,
                    useValue: { addCacheTags, setCachePolicy: jest.fn() },
                },
            ],
        );

        TestBed.createComponent(TimetableStationComponent);

        expect(addCacheTags).toHaveBeenCalledWith(['calendar:cal-1']);
        expect(fetchCalendar).toHaveBeenCalled();
    });

    it('サーバーでは今日のダイヤでも充当編成を出さない（ブラウザの最初の描画と形をそろえる）', async () => {
        await setup(
            { calendar_id: 'cal-1', station_id: 'st-1', trip_direction: '0' },
            [
                {
                    provide: SsrResponse,
                    useValue: { addCacheTags, setCachePolicy: jest.fn() },
                },
            ],
        );
        setTodaysCalendars(['cal-1']);

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

    const calendar = { calendarId: 'cal-1' } as never;
    const trips = [{ tripId: 'trip-1' }] as never;
    const tripBlocks = [{ tripBlockId: 'block-1' }] as never;
    const tripClasses = [{ tripClassId: 'class-1' }] as never;
    const stations = [{ stationId: 'st-1' }] as never;
    const operations = [{ operationId: 'op-1' }] as never;
    const conditions = {
        calendarId: 'cal-1',
        stationId: 'st-1',
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
                                calendar_id: 'cal-1',
                                station_id: 'st-1',
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
        TimetableStationStore.setCalendar(calendar);
        TimetableStationStore.setTrips(trips);
        TimetableStationStore.setTripBlocks(tripBlocks);
        TimetableStationStore.setTripClasses(tripClasses);
        TimetableStationStore.setStations(stations);
        TimetableStationStore.setOperations(operations);
    };

    const emptyStore = () => {
        TimetableStationStore.setCalendar(null as never);
        TimetableStationStore.setTrips([]);
        TimetableStationStore.setTripBlocks([]);
        TimetableStationStore.setTripClasses([]);
        TimetableStationStore.setStations([]);
        TimetableStationStore.setOperations([]);
    };

    afterEach(() => {
        operations$ = of(undefined);
        fetchDataSpy.mockRestore();
        fixture.destroy();
        jest.clearAllMocks();
        restore.mockReset();
        emptyStore();
        TimetableStationStore.setHasFetchedTimetable(false);
        TimetableStationStore.resetLoading();
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
        expect(TimetableStationStore.snapshot()).toEqual({
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
