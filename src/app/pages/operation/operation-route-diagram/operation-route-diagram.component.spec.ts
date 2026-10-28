import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
    Router,
} from '@angular/router';
import {
    BehaviorSubject,
    defer,
    EMPTY,
    Observable,
    of,
    Subject,
    switchMap,
    throwError,
    timer,
} from 'rxjs';
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { NotificationService } from 'src/app/core/services/notification.service';
import { SsrResponse } from 'src/app/core/ssr/ssr-response';
import { setTodaysCalendars } from 'src/app/global-states/testing/set-todays-calendars';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';

import { OperationRouteDiagramService } from './services/operation-route-diagram.service';
import { OperationRouteDiagramStore } from './stores/operation-route-diagram.store';
import { OperationRouteDiagramComponent } from './operation-route-diagram.component';
import { LazyOptionsDirective } from 'src/app/shared/lazy-options/lazy-options.directive';

describe('OperationRouteDiagramComponent', () => {
    let component: OperationRouteDiagramComponent;
    let fixture: ComponentFixture<OperationRouteDiagramComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRouteDiagramComponent],
            providers: [
                provideRouter([]),
                {
                    provide: OperationRouteDiagramService,
                    useValue: {
                        fetchOperationTrips: () => EMPTY,
                        fetchStations: () => EMPTY,
                    },
                },
            ],
        })
            .overrideComponent(OperationRouteDiagramComponent, {
                set: {
                    imports: [LazyOptionsDirective],
                    schemas: [NO_ERRORS_SCHEMA],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationRouteDiagramComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('列車の帯を押すと、その列車の全線時刻表へ移る', () => {
        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);

        component.onClickNavigateTimetable({
            tripBlockId: 'block-1',
            tripDirection: ETripDirection.OUTBOUND,
        });

        expect(navigate).toHaveBeenCalledWith([
            '/timetable',
            'all-line',
            expect.objectContaining({
                trip_block_id: 'block-1',
                trip_direction: ETripDirection.OUTBOUND,
            }),
        ]);
    });

    it('途中の切り替えが 2 件あっても、列車 id で区別する', () => {
        TestBed.inject(OperationRouteDiagramStore).setOperationTrips({
            operation: { operationId: 'op-1', calendarId: 'cal-1' },
            trips: [
                { trip: { tripId: 't1', tripNumber: '1818K' } },
                { trip: { tripId: 't2', tripNumber: '1818K' } },
            ],
        } as never);
        const end = {
            tripOperationListId: 'x',
            tripId: 'x',
            operationId: 'x',
            operationNumber: '18K',
            stationId: 's',
            rule: 1,
        };
        TestBed.inject(OperationRouteDiagramStore).setItineraryLinks([
            {
                tripOperationListId: 'a',
                tripId: 't1',
                operationId: 'op-1',
                previous: null,
                next: end,
            },
            {
                tripOperationListId: 'b',
                tripId: 't2',
                operationId: 'op-1',
                previous: null,
                next: end,
            },
        ] as never);

        const labels = component.linkLabels();

        expect(Object.keys(labels.midTrip)).toEqual(['t1', 't2']);
        expect(labels.midTrip['t1']).toEqual(labels.midTrip['t2']);
    });
});

describe('OperationRouteDiagramComponent の読み込み中', () => {
    let fixture: ComponentFixture<OperationRouteDiagramComponent>;
    let trips$: Subject<undefined>;

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const query = (selector: string) =>
        (fixture.nativeElement as HTMLElement).querySelector(selector);

    const setup = async (params: Record<string, string>) => {
        trips$ = new Subject<undefined>();
        await TestBed.configureTestingModule({
            imports: [OperationRouteDiagramComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: { paramMap: of(convertToParamMap(params)) },
                },
                {
                    provide: OperationRouteDiagramService,
                    useValue: {
                        fetchOperationTrips: () => trips$,
                        fetchStations: () => of(undefined),
                        fetchItineraryLinks: () => of(undefined),
                    },
                },
            ],
        })
            .overrideComponent(OperationRouteDiagramComponent, {
                set: {
                    imports: [LazyOptionsDirective],
                    schemas: [NO_ERRORS_SCHEMA],
                },
            })
            .compileComponents();
        fixture = TestBed.createComponent(OperationRouteDiagramComponent);
        fixture.detectChanges();
    };

    afterEach(() => {
        fixture.destroy();
    });

    it('運用番号があって取り終わるまでは、図の骨組みを出し、空表示を出さない', async () => {
        await setup({ operation_id: 'op-1' });

        expect(query('[data-testid="route-diagram-skeleton"]')).not.toBeNull();
        expect(query('app-empty-state')).toBeNull();
    });

    it('取り終えたら骨組みを消す（成功）', async () => {
        await setup({ operation_id: 'op-1' });

        trips$.next(undefined);
        trips$.complete();
        await flush();
        fixture.detectChanges();

        expect(query('[data-testid="route-diagram-skeleton"]')).toBeNull();
    });

    it('取り終えたら骨組みを消す（失敗しても）', async () => {
        // fetchData() は失敗を投げ直す（既存の振る舞い）。コンストラクタは受け止めないので、
        // zone.js が未処理の拒否としてテストを落とす。ここだけ本物の fetchData の失敗を受け流す
        const original = OperationRouteDiagramComponent.prototype.fetchData;
        const spy = jest
            .spyOn(OperationRouteDiagramComponent.prototype, 'fetchData')
            .mockImplementation(function (
                this: OperationRouteDiagramComponent,
            ) {
                return original.call(this).catch(() => undefined);
            });
        await setup({ operation_id: 'op-1' });

        trips$.error(new Error('offline'));
        await flush();
        fixture.detectChanges();
        spy.mockRestore();

        expect(query('[data-testid="route-diagram-skeleton"]')).toBeNull();
    });

    it('main は全線時刻表と同じ高さ固定（ページ全体はスクロールしない）', async () => {
        await setup({ operation_id: 'op-1' });

        const main = query('main');
        expect(main).toHaveClass(
            'tw-box-border',
            'tw-flex',
            'tw-flex-col',
            'tw-h-[calc(100dvh-48px)]',
            'md:tw-h-[calc(100dvh-64px)]',
            'tw-pb-4',
        );
        expect(query('[data-testid="route-diagram-skeleton"]')).toHaveClass(
            'tw-flex-1',
            'tw-min-h-0',
        );
        expect(
            query('[data-testid="route-diagram-skeleton"]')?.className,
        ).not.toContain('calc(100dvh');
    });

    it('空状態はカードの場所の中央に出す', async () => {
        await setup({});

        expect(query('app-empty-state')?.parentElement).toHaveClass(
            'tw-flex-1',
            'tw-items-center',
            'tw-justify-center',
        );
    });

    it('運用番号が無ければ、骨組みでなく「運用番号を設定して検索してください」を出す', async () => {
        await setup({});

        expect(query('[data-testid="route-diagram-skeleton"]')).toBeNull();
        expect(query('app-empty-state')).not.toBeNull();
    });

    it('取り直しが重なったとき、先に終わった古い取得は骨組みを消さない', async () => {
        await setup({ operation_id: 'op-1' });
        const firstTrips$ = trips$;
        const secondTrips$ = new Subject<undefined>();
        trips$ = secondTrips$;
        fixture.componentInstance.fetchData().catch(() => undefined);

        firstTrips$.next(undefined);
        firstTrips$.complete();
        await flush();
        fixture.detectChanges();
        expect(query('[data-testid="route-diagram-skeleton"]')).not.toBeNull();

        secondTrips$.next(undefined);
        secondTrips$.complete();
        await flush();
        fixture.detectChanges();
        expect(query('[data-testid="route-diagram-skeleton"]')).toBeNull();
    });

    it('別の運用へ移って取り直すときは骨組みに戻す', async () => {
        await setup({ operation_id: 'op-1' });
        trips$.next(undefined);
        trips$.complete();
        await flush();
        fixture.detectChanges();

        trips$ = new Subject<undefined>();
        fixture.componentInstance.fetchData().catch(() => undefined);
        fixture.detectChanges();

        expect(query('[data-testid="route-diagram-skeleton"]')).not.toBeNull();
    });

    it('ページを離れてすぐ戻ったとき、前のインスタンスの取得が後から終わっても、新しい取得が終わるまで骨組みは消えない', async () => {
        await setup({ operation_id: 'op-1' });
        const previousTrips$ = trips$;
        fixture.destroy();
        trips$ = new Subject<undefined>();
        fixture = TestBed.createComponent(OperationRouteDiagramComponent);
        fixture.detectChanges();

        previousTrips$.next(undefined);
        previousTrips$.complete();
        await flush();
        fixture.detectChanges();
        expect(query('[data-testid="route-diagram-skeleton"]')).not.toBeNull();

        trips$.next(undefined);
        trips$.complete();
        await flush();
        fixture.detectChanges();
        expect(query('[data-testid="route-diagram-skeleton"]')).toBeNull();
    });
});

describe('OperationRouteDiagramComponent の帯の操作', () => {
    let component: OperationRouteDiagramComponent;
    let navigate: jest.SpyInstance;
    const paramMap$ = new BehaviorSubject(
        convertToParamMap({ operation_id: 'b1' }),
    );
    const op = (operationId: string, operationNumber: string) =>
        ({ operationId, operationNumber }) as OperationDetailsDto;
    const byCalendar: Record<string, OperationDetailsDto[]> = {
        'cal-1': [op('a1', '42G'), op('b1', '43G')],
        'cal-2': [op('b2', '43G'), op('c2', '44G')],
        'cal-3': [op('d3', '11')],
    };

    beforeEach(async () => {
        // 前のテストで URL を変えていても、毎回 運用 b1 の URL から始める
        paramMap$.next(convertToParamMap({ operation_id: 'b1' }));
        await TestBed.configureTestingModule({
            imports: [OperationRouteDiagramComponent],
            providers: [
                provideRouter([]),
                {
                    // EMPTY だと constructor の fetchData が未処理の拒否になり、テストの実行が落ちる
                    provide: OperationRouteDiagramService,
                    useValue: {
                        fetchOperationTrips: () => of(undefined),
                        fetchStations: () => of(undefined),
                        fetchItineraryLinks: () => of(undefined),
                    },
                },
                {
                    provide: OperationService,
                    useValue: {
                        findManyByCalendarId: ({ calendarId }) =>
                            of(byCalendar[calendarId] ?? []),
                    },
                },
                { provide: ActivatedRoute, useValue: { paramMap: paramMap$ } },
                { provide: NotificationService, useValue: { open: jest.fn() } },
            ],
        })
            .overrideComponent(OperationRouteDiagramComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();
        setTodaysCalendars(['cal-today']);

        navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
        component = TestBed.createComponent(
            OperationRouteDiagramComponent,
        ).componentInstance;
        component.selectedCalendarId.set('cal-1');
        navigate.mockClear();
    });

    it('運用番号を選ぶと、その運用の行路図へ移る', () => {
        component.onOperationChange('a1');
        expect(navigate).toHaveBeenCalledWith([
            '/operation/route-diagram',
            { operation_id: 'a1' },
        ]);
    });

    it('ダイヤを替えたとき、同じ運用番号があればその運用へ移る', async () => {
        TestBed.inject(OperationRouteDiagramStore).setOperationTrips({
            operation: op('b1', '43G'),
            trips: [],
        } as unknown as OperationTripsDto);
        await component.onCalendarChange('cal-2');
        expect(navigate).toHaveBeenCalledWith([
            '/operation/route-diagram',
            { operation_id: 'b2' },
        ]);
        expect(component.selectedCalendarId()).toBe('cal-2');
    });

    it('同じ運用番号が無ければ運用番号を外し、選んだダイヤを残す', async () => {
        TestBed.inject(OperationRouteDiagramStore).setOperationTrips({
            operation: op('b1', '43G'),
            trips: [],
        } as unknown as OperationTripsDto);
        await component.onCalendarChange('cal-3');
        expect(navigate).toHaveBeenCalledWith(['/operation/route-diagram']);
        expect(component.selectedCalendarId()).toBe('cal-3');
    });

    it('前後の運用へ送ると、その運用へ移る', () => {
        component.onStep({ id: 'a1', label: '42G' });
        expect(navigate).toHaveBeenCalledWith([
            '/operation/route-diagram',
            { operation_id: 'a1' },
        ]);
    });

    it('運用番号の無い URL に移ったら、前の運用の図を消す', () => {
        TestBed.inject(OperationRouteDiagramStore).setOperationTrips({
            operation: op('b1', '43G'),
            trips: [],
        } as unknown as OperationTripsDto);
        paramMap$.next(convertToParamMap({}));
        expect(component.operation()).toBeUndefined();
    });

    it('運用番号の無い URL に移ったら、運用番号の選択欄も空にする', () => {
        paramMap$.next(convertToParamMap({}));
        expect(component.searchOperationId()).toBeNull();
    });

    it('運用を開いていないときにダイヤを替えても、同じ URL へは移らず選択肢だけ替える', async () => {
        paramMap$.next(convertToParamMap({}));
        await component.onCalendarChange('cal-2');
        expect(navigate).not.toHaveBeenCalled();
        expect(component.selectedCalendarId()).toBe('cal-2');
    });

    const withCalendar = (o: OperationDetailsDto, calendarId: string) =>
        ({
            operation: { ...o, calendar: { calendarId } },
            trips: [],
        }) as unknown as OperationTripsDto;

    it('同じ番号が無いダイヤに替えた後、「戻る」で元の運用に戻ると、ダイヤの選択欄も元に戻る', async () => {
        TestBed.inject(OperationRouteDiagramStore).setOperationTrips(
            withCalendar(op('b1', '43G'), 'cal-1'),
        );
        expect(component.selectedCalendarId()).toBe('cal-1');
        await component.onCalendarChange('cal-3');
        paramMap$.next(convertToParamMap({}));
        expect(component.selectedCalendarId()).toBe('cal-3');

        paramMap$.next(convertToParamMap({ operation_id: 'b1' }));
        expect(component.selectedCalendarId()).toBe('cal-3');
        TestBed.inject(OperationRouteDiagramStore).setOperationTrips(
            withCalendar(op('b1', '43G'), 'cal-1'),
        );
        expect(component.selectedCalendarId()).toBe('cal-1');
    });

    it('運用を開いて取り終える前は、今日のダイヤに補わない', () => {
        TestBed.inject(OperationRouteDiagramStore).setOperationTrips(null);
        const fresh = TestBed.createComponent(
            OperationRouteDiagramComponent,
        ).componentInstance;
        expect(fresh.selectedCalendarId()).toBeNull();
        TestBed.inject(OperationRouteDiagramStore).setOperationTrips(
            withCalendar(op('b1', '43G'), 'cal-1'),
        );
        expect(fresh.selectedCalendarId()).toBe('cal-1');
    });

    it('運用が無ければ今日のダイヤにする', () => {
        paramMap$.next(convertToParamMap({}));
        const fresh = TestBed.createComponent(
            OperationRouteDiagramComponent,
        ).componentInstance;
        expect(fresh.selectedCalendarId()).toBe('cal-today');
    });

    it('ダイヤを続けて替えたとき、先に選んだダイヤの結果が後から届いても移らない', async () => {
        TestBed.inject(OperationRouteDiagramStore).setOperationTrips(
            withCalendar(op('b1', '43G'), 'cal-1'),
        );
        const slow = new Subject<OperationDetailsDto[]>();
        jest.spyOn(
            TestBed.inject(OperationService),
            'findManyByCalendarId',
        ).mockImplementation(({ calendarId }) =>
            calendarId === 'cal-2' ? slow : of(byCalendar[calendarId] ?? []),
        );

        const first = component.onCalendarChange('cal-2');
        await component.onCalendarChange('cal-3');
        slow.next(byCalendar['cal-2']);
        slow.complete();
        await first;

        expect(navigate).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledWith(['/operation/route-diagram']);
        expect(component.selectedCalendarId()).toBe('cal-3');
    });

    it('一覧の取得に失敗したら移らず、知らせて選択を戻す', async () => {
        TestBed.inject(OperationRouteDiagramStore).setOperationTrips(
            withCalendar(op('b1', '43G'), 'cal-1'),
        );
        jest.spyOn(
            TestBed.inject(OperationService),
            'findManyByCalendarId',
        ).mockReturnValue(throwError(() => new Error('offline')));

        await component.onCalendarChange('cal-2');

        expect(navigate).not.toHaveBeenCalled();
        expect(component.selectedCalendarId()).toBe('cal-1');
        expect(TestBed.inject(NotificationService).open).toHaveBeenCalled();
    });

    it('運用が無いときの要約の頭は、選んでいるダイヤ', () => {
        paramMap$.next(convertToParamMap({}));
        component.selectedCalendarId.set('cal-x');
        jest.spyOn(component, 'calendars').mockReturnValue([
            {
                calendarId: 'cal-x',
                calendarName: '平日ダイヤ',
                startDate: '2026-03-14',
            },
        ] as never);
        expect(component.summaryLead()).toBe('2026/3/14改正 平日ダイヤ');
    });
});

describe('OperationRouteDiagramComponent の帯の配線（本物のテンプレート）', () => {
    it('「今日」を押すと onCalendarChange、前後の運用を押すと onStep が呼ばれる', async () => {
        const op = (operationId: string, operationNumber: string) =>
            ({ operationId, operationNumber }) as OperationDetailsDto;
        await TestBed.configureTestingModule({
            imports: [OperationRouteDiagramComponent],
            providers: [
                provideRouter([]),
                {
                    provide: OperationRouteDiagramService,
                    useValue: {
                        fetchOperationTrips: () => of(undefined),
                        fetchStations: () => of(undefined),
                        fetchItineraryLinks: () => of(undefined),
                    },
                },
                {
                    provide: OperationService,
                    useValue: {
                        findManyByCalendarId: () =>
                            of([op('a1', '42G'), op('b1', '43G')]),
                    },
                },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap({ operation_id: 'b1' })),
                    },
                },
            ],
        }).compileComponents();
        setTodaysCalendars(['cal-today']);
        jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

        const fixture = TestBed.createComponent(OperationRouteDiagramComponent);
        const component = fixture.componentInstance;
        component.selectedCalendarId.set('cal-old');
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const onCalendarChange = jest
            .spyOn(component, 'onCalendarChange')
            .mockResolvedValue();
        const onStep = jest.spyOn(component, 'onStep').mockReturnValue();
        const root = fixture.nativeElement as HTMLElement;

        (
            root.querySelector(
                'app-today-calendar-button button',
            ) as HTMLButtonElement
        ).click();
        expect(onCalendarChange).toHaveBeenCalledWith('cal-today');

        (
            root.querySelector('app-step-nav button') as HTMLButtonElement
        ).click();
        expect(onStep).toHaveBeenCalledWith({ id: 'a1', label: '42G' });
    });
});

describe('OperationRouteDiagramComponent のサーバー', () => {
    it('取った運用のダイヤでタグを付ける（運用の URL にダイヤは無い）', async () => {
        const addCacheTags = jest.fn();
        await TestBed.configureTestingModule({
            imports: [OperationRouteDiagramComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            convertToParamMap({ operation_id: 'op-1' }),
                        ),
                    },
                },
                {
                    provide: OperationRouteDiagramService,
                    useValue: {
                        // 運用を取ると、そのダイヤがストアに入る
                        fetchOperationTrips: () =>
                            defer(() => {
                                TestBed.inject(
                                    OperationRouteDiagramStore,
                                ).setOperationTrips({
                                    operation: {
                                        operationId: 'op-1',
                                        calendarId: 'cal-1',
                                    },
                                    trips: [],
                                } as never);
                                return of(undefined);
                            }),
                        fetchStations: () => of(undefined),
                        fetchItineraryLinks: () => of(undefined),
                    },
                },
                {
                    provide: SsrResponse,
                    useValue: { addCacheTags, setCachePolicy: jest.fn() },
                },
            ],
        })
            .overrideComponent(OperationRouteDiagramComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();

        const fixture = TestBed.createComponent(OperationRouteDiagramComponent);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(addCacheTags).toHaveBeenCalledWith(['calendar:cal-1']);

        fixture.destroy();
    });
});

describe('OperationRouteDiagramComponent の圏外の保存', () => {
    let fixture: ComponentFixture<OperationRouteDiagramComponent>;
    let fetchDataSpy: jest.SpyInstance;
    let trips$: Observable<undefined>;
    let stations$: Observable<undefined>;
    let links$: Observable<undefined>;
    const save = jest.fn(() => Promise.resolve());
    const restore = jest.fn();
    // spy に差し替わる前の本物の fetchData
    const originalFetchData =
        OperationRouteDiagramComponent.prototype.fetchData;

    const operationTrips = {
        operation: { operationId: 'op-1', calendarId: 'cal-1' },
        trips: [],
    } as never;
    const itineraryLinks = [{ tripOperationListId: 'link-1' }] as never;
    const stations = [{ stationId: 'st-1' }] as never;
    const stationAliases = { 'st-2': 'st-1' };
    const conditions = { operationId: 'op-1' };

    const flush = () => new Promise((resolve) => setTimeout(resolve, 10));
    // 次のタスクで失敗する取得。すぐ失敗させると、Zone の Promise と async/await の順序の都合で
    // 「処理されない拒否」と見なされ、ComponentFixture が投げ直してしまう
    const failLater = (message: string) =>
        timer(0).pipe(switchMap(() => throwError(() => new Error(message))));

    const setup = async () => {
        // fetchData() は失敗を投げ直す（既存の振る舞い）。コンストラクタは受け止めないので、
        // 本物の fetchData の失敗だけ受け流す
        const original = OperationRouteDiagramComponent.prototype.fetchData;
        fetchDataSpy = jest
            .spyOn(OperationRouteDiagramComponent.prototype, 'fetchData')
            .mockImplementation(function (
                this: OperationRouteDiagramComponent,
            ) {
                return original.call(this).catch(() => undefined);
            });
        await TestBed.configureTestingModule({
            imports: [OperationRouteDiagramComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            convertToParamMap({ operation_id: 'op-1' }),
                        ),
                    },
                },
                {
                    provide: OperationRouteDiagramService,
                    useValue: {
                        fetchOperationTrips: () => trips$,
                        fetchStations: () => stations$,
                        fetchItineraryLinks: () => links$,
                    },
                },
                { provide: OfflineSnapshots, useValue: { save, restore } },
            ],
        })
            .overrideComponent(OperationRouteDiagramComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();
    };

    // 取得は成功した形のストア（サービスの差し替えはストアへ書かないので、先に入れておく）
    const fillStore = () => {
        TestBed.inject(OperationRouteDiagramStore).setOperationTrips(
            operationTrips,
        );
        TestBed.inject(OperationRouteDiagramStore).setItineraryLinks(
            itineraryLinks,
        );
        TestBed.inject(OperationRouteDiagramStore).setStations(stations);
        TestBed.inject(OperationRouteDiagramStore).setStationAliases(
            stationAliases,
        );
    };

    afterEach(() => {
        fetchDataSpy.mockRestore();
        fixture?.destroy();
        jest.clearAllMocks();
        restore.mockReset();
    });

    it('成功したら条件と中身を保存する', async () => {
        trips$ = of(undefined);
        stations$ = of(undefined);
        links$ = of(undefined);
        await setup();
        fillStore();

        fixture = TestBed.createComponent(OperationRouteDiagramComponent);
        await flush();

        expect(save).toHaveBeenCalledWith({
            key: 'OperationRouteDiagram',
            conditions,
            data: { operationTrips, itineraryLinks, stations, stationAliases },
        });
        expect(restore).not.toHaveBeenCalled();
    });

    it('前後の運用の取得だけが失敗したときは、保存も戻しもしない', async () => {
        trips$ = of(undefined);
        stations$ = of(undefined);
        links$ = failLater('offline-links');
        await setup();
        fillStore();

        fixture = TestBed.createComponent(OperationRouteDiagramComponent);
        await flush();

        expect(save).not.toHaveBeenCalled();
        expect(restore).not.toHaveBeenCalled();
        expect(fixture.componentInstance.isLoading()).toBe(false);
    });

    it('失敗したら保存した中身を、読み込み中を解く前に戻し、路線の選択を中身に合わせる', async () => {
        trips$ = failLater('offline');
        stations$ = of(undefined);
        links$ = of(undefined);
        await setup();
        let isLoadingWhenRestored: boolean | undefined;
        restore.mockImplementation(
            (params: { apply: (data: unknown, savedAt: number) => void }) => {
                isLoadingWhenRestored = fixture.componentInstance.isLoading();
                params.apply(
                    {
                        operationTrips: {
                            operation: {
                                operationId: 'op-1',
                                calendarId: 'cal-1',
                            },
                            trips: [
                                {
                                    startTime: { stationId: 'st-1' },
                                    endTime: { stationId: 'st-1' },
                                },
                            ],
                        },
                        itineraryLinks,
                        stations: [
                            {
                                stationId: 'st-1',
                                routeStationLists: [
                                    { route: { routeId: 'route-9' } },
                                ],
                            },
                        ],
                        stationAliases,
                    },
                    0,
                );
                return Promise.resolve(null);
            },
        );

        fixture = TestBed.createComponent(OperationRouteDiagramComponent);
        await flush();

        expect(save).not.toHaveBeenCalled();
        expect(restore).toHaveBeenCalledWith({
            key: 'OperationRouteDiagram',
            conditions,
            apply: expect.any(Function),
        });
        expect(isLoadingWhenRestored).toBe(true);
        expect(TestBed.inject(OperationRouteDiagramStore).stations()).toEqual([
            expect.objectContaining({ stationId: 'st-1' }),
        ]);
        expect(
            TestBed.inject(OperationRouteDiagramStore).itineraryLinks(),
        ).toEqual(itineraryLinks);
        // 戻した駅・運用の経由路線に選択を合わせている
        expect(
            TestBed.inject(OperationRouteDiagramStore).selectedRouteIds(),
        ).toEqual(['route-9']);
        expect(fixture.componentInstance.isLoading()).toBe(false);
    });

    it('片方が先に失敗しても、残りの取得（前後の運用を含む）が終わってから戻す', async () => {
        const stationsLate = new Subject<undefined>();
        const linksLate = new Subject<undefined>();
        trips$ = failLater('offline');
        stations$ = stationsLate;
        links$ = linksLate;
        await setup();

        fixture = TestBed.createComponent(OperationRouteDiagramComponent);
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
        trips$ = failLater('offline-first');
        stations$ = of(undefined);
        links$ = of(undefined);
        await setup();
        fixture = TestBed.createComponent(OperationRouteDiagramComponent);

        // 取り直しを始めてから、先の取得の失敗が届く
        trips$ = of(undefined);
        await fixture.componentInstance.fetchData();
        await flush();

        expect(restore).not.toHaveBeenCalled();
    });

    it('戻す処理が壊れていても、読み込み中を解き、取得の失敗を投げる', async () => {
        trips$ = of(undefined);
        stations$ = of(undefined);
        links$ = of(undefined);
        await setup();
        restore.mockRejectedValue(new Error('broken snapshot'));
        fixture = TestBed.createComponent(OperationRouteDiagramComponent);
        // コンストラクタの取得は受け流す
        await flush();

        trips$ = failLater('offline-again');
        await expect(
            originalFetchData.call(fixture.componentInstance),
        ).rejects.toThrow('offline-again');

        expect(restore).toHaveBeenCalled();
        expect(fixture.componentInstance.isLoading()).toBe(false);
    });
});
