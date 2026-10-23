import { provideHttpClient, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
    Router,
} from '@angular/router';
import { EMPTY, Observable, of, ReplaySubject, Subject } from 'rxjs';

import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { UserStateQuery } from 'src/app/global-states/user.state';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { CalendarSelectDialogService } from 'src/app/shared/calendar-select-dialog/services/calendar-select-dialog.service';
import { ConfirmDialogService } from 'src/app/shared/confirm-dialog/services/confirm-dialog.service';
import { TimetableAllLineService } from './services/timetable-all-line.service';
import { TimetableAllLineStore } from './stores/timetable-all-line.store';
import { TimetableAllLineComponent } from './timetable-all-line.component';

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
                    provide: CalendarListStateQuery,
                    useValue: {
                        selectByCalendarId: () => of(undefined),
                        calendars$: of([]),
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
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableAllLineComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

describe('TimetableAllLineComponent の URL の向き', () => {
    const setUp = async (params: Record<string, string>) => {
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
                    provide: CalendarListStateQuery,
                    useValue: {
                        selectByCalendarId: () => of(undefined),
                        calendars$: of([]),
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

        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
        TestBed.createComponent(TimetableAllLineComponent);
        return {
            navigate,
            service: TestBed.inject(TimetableAllLineService) as unknown as {
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
        expect(TimetableAllLineStore.tripDirection).toBe(1);
    });
});

describe('TimetableAllLineComponent の読み込み中', () => {
    let fixture: ComponentFixture<TimetableAllLineComponent>;
    let tripBlocks$: Subject<undefined>;
    let fetchTripBlocksCalls = 0;
    let canEditTimetable$: Observable<boolean>;

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const query = (selector: string) =>
        (fixture.nativeElement as HTMLElement).querySelector(selector);

    const setup = async (params: Record<string, string>) => {
        tripBlocks$ = new ReplaySubject<undefined>(1);
        fetchTripBlocksCalls = 0;
        canEditTimetable$ = of(false);
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
                        fetchStations: () => of(undefined),
                        fetchTripBlocks: () => {
                            fetchTripBlocksCalls++;
                            return tripBlocks$;
                        },
                        deleteTripFromTripBlock: () => of(undefined),
                    },
                },
                {
                    provide: CalendarListStateQuery,
                    useValue: {
                        selectByCalendarId: () => of(undefined),
                        calendars$: of([]),
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
                    provide: UserStateQuery,
                    useValue: {
                        get canEditTimetable$() {
                            return canEditTimetable$;
                        },
                    },
                },
            ],
        })
            .overrideComponent(TimetableAllLineComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
        fixture = TestBed.createComponent(TimetableAllLineComponent);
        fixture.detectChanges();
    };

    afterEach(() => {
        jest.restoreAllMocks();
        fixture.destroy();
        TimetableAllLineStore.setCalendarId(null as unknown as string);
        TimetableAllLineStore.setHasFetchedTripBlocks(false);
        TimetableAllLineStore.resetLoading();
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
            canEditTimetable$ = of(isEditor);
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
        TimetableAllLineStore.setCalendarId('cal-old');
        TimetableAllLineStore.setHasFetchedTripBlocks(true);
        // 向きの無い URL は取得せず置き換えるだけ（取得の始めのリセットでは骨組みに戻らない道）
        jest.spyOn(Router.prototype, 'navigate').mockResolvedValue(true);

        await setup({ calendar_id: 'cal-1' });

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
                    provide: CalendarListStateQuery,
                    useValue: {
                        selectByCalendarId: () => of(undefined),
                        calendars$: of([]),
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
        TimetableAllLineStore.setCalendarId(null as unknown as string);
        TimetableAllLineStore.setHasFetchedTripBlocks(false);
        TimetableAllLineStore.resetLoading();
        TimetableAllLineStore.setControlCollapsed(false);
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
        TimetableAllLineStore.setCalendarId('cal-1');
        component.onCalendarChange('cal-1');
        expect(navigate).not.toHaveBeenCalled();
    });

    it('駅を選ぶと、同じダイヤ・方向で駅別時刻表へ移る', () => {
        TimetableAllLineStore.setCalendarId('cal-1');
        TimetableAllLineStore.setTripDirection(1);
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
