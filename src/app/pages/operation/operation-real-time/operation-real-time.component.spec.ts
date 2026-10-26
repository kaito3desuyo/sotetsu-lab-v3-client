import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
    BehaviorSubject,
    EMPTY,
    firstValueFrom,
    of,
    Subject,
    switchMap,
    throwError,
    timer,
} from 'rxjs';
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { NotificationService } from 'src/app/core/services/notification.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { OperationPostDialogService } from 'src/app/shared/operation-post-dialog/operation-post-dialog.service';
import { OperationPostCardService } from 'src/app/shared/operation-post-card/operation-post-card.service';
import { OperationRealTimeService } from './services/operation-real-time.service';
import { OperationRealTimeComponent } from './operation-real-time.component';
import {
    OperationRealTimeSnapshot,
    OperationRealTimeStore,
} from './stores/operation-real-time.store';

describe('OperationRealTimeComponent', () => {
    let component: OperationRealTimeComponent;
    let fixture: ComponentFixture<OperationRealTimeComponent>;
    const open = jest.fn();

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([]),
                OperationRealTimeService,
                {
                    provide: SocketService,
                    useValue: { on: () => EMPTY },
                },
                {
                    provide: NotificationService,
                    useValue: { open: () => {} },
                },
                {
                    provide: OperationPostCardService,
                    useValue: { submitEvent$: EMPTY },
                },
                { provide: OperationPostDialogService, useValue: { open } },
            ],
        })
            .overrideComponent(OperationRealTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationRealTimeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('右下の投稿ボタンは、空の投稿ダイアログを開く', () => {
        fixture.detectChanges();
        const fab = (fixture.nativeElement as HTMLElement).querySelector(
            'button[data-testid="post-fab"]',
        ) as HTMLButtonElement;
        fab.click();
        expect(open).toHaveBeenCalledWith();
    });

    it('投稿カードを出さない', () => {
        fixture.detectChanges();
        expect(
            (fixture.nativeElement as HTMLElement).querySelector(
                'app-operation-post-card',
            ),
        ).toBeNull();
    });
});

describe('OperationRealTimeComponent の配置', () => {
    let fixture: ComponentFixture<OperationRealTimeComponent>;
    let breakpoint$: BehaviorSubject<BreakpointState>;

    const setup = async (desktop: boolean) => {
        breakpoint$ = new BehaviorSubject<BreakpointState>({
            matches: desktop,
            breakpoints: {},
        });
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([]),
                OperationRealTimeService,
                { provide: SocketService, useValue: { on: () => EMPTY } },
                { provide: NotificationService, useValue: { open: () => {} } },
                {
                    provide: OperationPostCardService,
                    useValue: { submitEvent$: EMPTY },
                },
                {
                    provide: BreakpointObserver,
                    useValue: {
                        observe: () => breakpoint$,
                        isMatched: () => breakpoint$.value.matches,
                    },
                },
            ],
        })
            .overrideComponent(OperationRealTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationRealTimeComponent);
        fixture.detectChanges();
    };

    const count = (selector: string) =>
        (fixture.nativeElement as HTMLElement).querySelectorAll(selector)
            .length;

    afterEach(() => fixture.destroy());

    it('md 以上では横並びだけを作り、タブは作らない', async () => {
        await setup(true);

        expect(count('mat-tab-group')).toBe(0);
        expect(count('app-operation-real-time-operation-table')).toBe(1);
        expect(count('app-operation-real-time-formation-table')).toBe(1);
    });

    it('md 未満ではタブだけを作り、横並びは作らない', async () => {
        await setup(false);

        expect(count('mat-tab-group')).toBe(1);
        expect(
            count('mat-tab-group app-operation-real-time-operation-table'),
        ).toBe(1);
        expect(count('app-operation-real-time-operation-table')).toBe(1);
    });

    it('画面幅が md をまたいだら、作る方を入れ替える', async () => {
        await setup(false);

        breakpoint$.next({ matches: true, breakpoints: {} });
        fixture.detectChanges();

        expect(count('mat-tab-group')).toBe(0);
        expect(count('app-operation-real-time-operation-table')).toBe(1);
    });
});

describe('OperationRealTimeComponent の取得の失敗', () => {
    let fixture: ComponentFixture<OperationRealTimeComponent>;
    let service: Record<string, jest.Mock>;
    let notification: { open: jest.Mock };
    let socket$: Subject<unknown>;
    let submit$: Subject<void>;

    const isLoading = () => firstValueFrom(OperationRealTimeStore.isLoading$);
    const finalUpdateTime = () =>
        firstValueFrom(OperationRealTimeStore.finalUpdateTime$);
    const fail = () => throwError(() => new Error('offline'));
    const signal = (data: string) =>
        socket$.next(new MessageEvent('message', { data }));

    beforeEach(async () => {
        jest.useFakeTimers();
        const ok = () => jest.fn(() => of(undefined));
        service = {
            fetchOperationGroups: ok(),
            fetchRoutes: ok(),
            fetchStations: ok(),
            fetchTripClasses: ok(),
            fetchCalendar: ok(),
            fetchOperations: ok(),
            fetchItineraryLinks: ok(),
            fetchFormations: ok(),
            fetchCurrentPositions: ok(),
            fetchOperationSightingTimeCrossSections: ok(),
            fetchFormationSightingTimeCrossSections: ok(),
            fetchSightingHistories: ok(),
            fetchCurrentPositionThatShouldUpdate: ok(),
        };
        notification = { open: jest.fn() };
        socket$ = new Subject<unknown>();
        submit$ = new Subject<void>();

        await TestBed.configureTestingModule({
            imports: [OperationRealTimeComponent],
            providers: [
                provideRouter([]),
                { provide: OperationRealTimeService, useValue: service },
                { provide: SocketService, useValue: { on: () => socket$ } },
                { provide: NotificationService, useValue: notification },
                {
                    provide: OperationPostCardService,
                    useValue: { submitEvent$: submit$ },
                },
            ],
        })
            .overrideComponent(OperationRealTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        OperationRealTimeStore.resetLoading();
        OperationRealTimeStore.setIsEnableAutoReload(true);
        fixture = TestBed.createComponent(OperationRealTimeComponent);
        fixture.detectChanges();
        // 開いたときの fetchData() を終わらせる
        await jest.advanceTimersByTimeAsync(0);
        OperationRealTimeStore.setFinalUpdateTime(0);
        notification.open.mockClear();
    });

    afterEach(() => {
        fixture.destroy();
        jest.useRealTimers();
    });

    it('1 秒ごとの現在位置の取得が続けて失敗しても、読み込み中が残らず、通知も出ない', async () => {
        service['fetchCurrentPositionThatShouldUpdate'].mockImplementation(
            fail,
        );

        await jest.advanceTimersByTimeAsync(3000);

        expect(
            service['fetchCurrentPositionThatShouldUpdate'],
        ).toHaveBeenCalledTimes(3);
        expect(await isLoading()).toBe(false);
        expect(notification.open).not.toHaveBeenCalled();
    });

    it('投稿後の取り直しが失敗したら、読み込み中が残らず失敗を知らせ、最終更新時刻は進めない', async () => {
        service['fetchFormationSightingTimeCrossSections'].mockImplementation(
            fail,
        );

        submit$.next();
        await jest.advanceTimersByTimeAsync(0);

        expect(await isLoading()).toBe(false);
        expect(notification.open).toHaveBeenCalledWith(
            'データの取得に失敗しました',
            'OK',
        );
        expect(await finalUpdateTime()).toBe(0);
    });

    it('他人の投稿後の取り直しが失敗したら、読み込み中が残らず失敗を知らせ、更新できたとは言わない', async () => {
        service['fetchSightingHistories'].mockImplementation(fail);

        signal('{"type":"sighting"}');
        await jest.advanceTimersByTimeAsync(0);

        expect(await isLoading()).toBe(false);
        expect(notification.open).toHaveBeenCalledWith(
            'データの取得に失敗しました',
            'OK',
        );
        expect(notification.open).not.toHaveBeenCalledWith(
            'データが更新されました',
            'OK',
        );
        expect(await finalUpdateTime()).toBe(0);
    });

    it('他人の投稿後の取り直しが成功したら、更新できたと知らせ、最終更新時刻を進める', async () => {
        signal('{"type":"sighting"}');
        await jest.advanceTimersByTimeAsync(0);

        expect(await isLoading()).toBe(false);
        expect(notification.open).toHaveBeenCalledWith(
            'データが更新されました',
            'OK',
        );
        expect(await finalUpdateTime()).toBeGreaterThan(0);
    });

    it('timetable の合図でも目撃を取り直す', async () => {
        service['fetchOperationSightingTimeCrossSections'].mockClear();

        signal('{"type":"timetable"}');
        await jest.advanceTimersByTimeAsync(0);

        expect(
            service['fetchOperationSightingTimeCrossSections'],
        ).toHaveBeenCalledTimes(1);
    });

    it('古い sendSighting の転送（{action}）では取り直さない', async () => {
        service['fetchOperationSightingTimeCrossSections'].mockClear();

        signal('{"action":"sendSighting","data":"{}"}');
        await jest.advanceTimersByTimeAsync(0);

        expect(
            service['fetchOperationSightingTimeCrossSections'],
        ).not.toHaveBeenCalled();
        expect(notification.open).not.toHaveBeenCalled();
    });
});

describe('OperationRealTimeComponent の圏外の保存', () => {
    let fixture: ComponentFixture<OperationRealTimeComponent>;
    let service: Record<string, jest.Mock>;
    let notification: { open: jest.Mock };
    let submit$: Subject<void>;
    const save = jest.fn(() => Promise.resolve());
    const restore = jest.fn();

    const isLoading = () => firstValueFrom(OperationRealTimeStore.isLoading$);
    const finalUpdateTime = () =>
        firstValueFrom(OperationRealTimeStore.finalUpdateTime$);
    // 次のタスクで失敗する取得。すぐ失敗させると「処理されない拒否」と見なされ、
    // ComponentFixture が投げ直してしまう
    const failLater = () =>
        timer(0).pipe(switchMap(() => throwError(() => new Error('offline'))));

    const savedAt = 1_700_000_000_000;
    const saved: OperationRealTimeSnapshot = {
        routes: [{ routeId: 'saved-route' }] as never,
        agencyOrder: ['saved-agency'],
        stations: [{ stationId: 'saved-station' }] as never,
        tripClasses: [{ tripClassId: 'saved-class' }] as never,
        calendar: { calendarId: 'saved-calendar' } as never,
        operations: [{ operationId: 'saved-operation' }] as never,
        itineraryLinks: [{ operationItineraryLinkId: 'saved-link' }] as never,
        formations: [{ formationId: 'saved-formation' }] as never,
        operationGroups: [{ name: 'saved-group' }] as never,
        operationSightingTimeCrossSections: { '1': { a: 1 } } as never,
        formationSightingTimeCrossSections: { '2': { a: 2 } } as never,
        operationSightingHistories: { '3': [] },
        formationSightingHistories: { '4': [] },
        currentPositions: { '5': { prev: null } } as never,
    };
    const restoreSaved = async (params: {
        apply: (data: OperationRealTimeSnapshot, savedAt: number) => void;
    }) => {
        params.apply(saved, savedAt);
        return { data: saved, savedAt };
    };

    const create = async () => {
        fixture = TestBed.createComponent(OperationRealTimeComponent);
        fixture.detectChanges();
        // 開いたときの fetchData() を終わらせる
        await jest.advanceTimersByTimeAsync(0);
        await jest.advanceTimersByTimeAsync(0);
    };

    beforeEach(async () => {
        jest.useFakeTimers();
        save.mockClear();
        restore.mockReset();
        const ok = () => jest.fn(() => of(undefined));
        service = {
            fetchOperationGroups: ok(),
            fetchRoutes: ok(),
            fetchStations: ok(),
            fetchTripClasses: ok(),
            fetchCalendar: ok(),
            fetchOperations: ok(),
            fetchItineraryLinks: ok(),
            fetchFormations: ok(),
            fetchCurrentPositions: ok(),
            fetchOperationSightingTimeCrossSections: ok(),
            fetchFormationSightingTimeCrossSections: ok(),
            fetchSightingHistories: ok(),
            fetchCurrentPositionThatShouldUpdate: ok(),
        };
        notification = { open: jest.fn() };
        submit$ = new Subject<void>();

        await TestBed.configureTestingModule({
            imports: [OperationRealTimeComponent],
            providers: [
                provideRouter([]),
                { provide: OperationRealTimeService, useValue: service },
                { provide: SocketService, useValue: { on: () => EMPTY } },
                { provide: NotificationService, useValue: notification },
                {
                    provide: OperationPostCardService,
                    useValue: { submitEvent$: submit$ },
                },
                { provide: OfflineSnapshots, useValue: { save, restore } },
            ],
        })
            .overrideComponent(OperationRealTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        OperationRealTimeStore.resetLoading();
        OperationRealTimeStore.setIsEnableAutoReload(true);
    });

    afterEach(() => {
        fixture.destroy();
        jest.useRealTimers();
    });

    it('成功したら条件と中身を保存する', async () => {
        OperationRealTimeStore.setRoutes(saved.routes);
        OperationRealTimeStore.setCurrentPosition('5', {
            prev: null,
        } as never);

        await create();

        expect(save).toHaveBeenCalledTimes(1);
        const [params] = save.mock.calls[0] as unknown as [
            {
                key: string;
                conditions: unknown;
                data: OperationRealTimeSnapshot;
            },
        ];
        expect(params.key).toBe('OperationRealTime');
        expect(params.conditions).toEqual({});
        expect(params.data.routes).toEqual(saved.routes);
        expect(params.data.currentPositions['5']).toEqual({ prev: null });
        expect(Object.keys(params.data).sort()).toEqual(
            Object.keys(saved).sort(),
        );
        expect(restore).not.toHaveBeenCalled();
    });

    it('取得が 1 本でも失敗したら保存しない', async () => {
        service['fetchSightingHistories'].mockImplementation(failLater);
        restore.mockResolvedValue(null);

        await create();

        expect(save).not.toHaveBeenCalled();
    });

    it('前後の運用の取得だけ失敗したら保存しない（戻しも失敗の通知もしない）', async () => {
        service['fetchItineraryLinks'].mockImplementation(() =>
            of({ failed: true }),
        );

        await create();

        expect(save).not.toHaveBeenCalled();
        expect(restore).not.toHaveBeenCalled();
        expect(notification.open).not.toHaveBeenCalledWith(
            'データの取得に失敗しました',
            'OK',
        );
        expect(await isLoading()).toBe(false);
    });

    it('失敗したら保存した中身を戻し、最終更新に保存した時刻を出し、失敗の通知は出さない', async () => {
        service['fetchCalendar'].mockImplementation(failLater);
        restore.mockImplementation(restoreSaved);

        await create();

        expect(restore).toHaveBeenCalledTimes(1);
        expect(restore.mock.calls[0][0].key).toBe('OperationRealTime');
        expect(restore.mock.calls[0][0].conditions).toEqual({});
        expect(OperationRealTimeStore.routes).toEqual(saved.routes);
        expect(OperationRealTimeStore.calendar).toEqual(saved.calendar);
        expect(OperationRealTimeStore.formations).toEqual(saved.formations);
        expect(await finalUpdateTime()).toBe(Math.floor(savedAt / 1000));
        expect(
            await firstValueFrom(OperationRealTimeStore.hasFetchedOperations$),
        ).toBe(true);
        expect(
            await firstValueFrom(OperationRealTimeStore.hasFetchedFormations$),
        ).toBe(true);
        expect(notification.open).not.toHaveBeenCalledWith(
            'データの取得に失敗しました',
            'OK',
        );
        expect(await isLoading()).toBe(false);
        expect(save).not.toHaveBeenCalled();
    });

    it('戻せなかったら、今の失敗の文言を出す', async () => {
        service['fetchCalendar'].mockImplementation(failLater);
        restore.mockResolvedValue(null);

        await create();

        expect(notification.open).toHaveBeenCalledWith(
            'データの取得に失敗しました',
            'OK',
        );
        expect(await isLoading()).toBe(false);
    });

    it('戻す処理が壊れていても、読み込み中を解いて今の失敗の文言を出す', async () => {
        service['fetchCalendar'].mockImplementation(failLater);
        restore.mockRejectedValue(new Error('broken snapshot'));

        await create();

        expect(notification.open).toHaveBeenCalledWith(
            'データの取得に失敗しました',
            'OK',
        );
        expect(await isLoading()).toBe(false);
    });

    it('自動更新の取得が失敗しても戻さず知らせない', async () => {
        await create();
        restore.mockClear();
        save.mockClear();
        notification.open.mockClear();
        service['fetchCurrentPositionThatShouldUpdate'].mockImplementation(
            failLater,
        );

        await jest.advanceTimersByTimeAsync(3000);

        expect(
            service['fetchCurrentPositionThatShouldUpdate'],
        ).toHaveBeenCalled();
        expect(restore).not.toHaveBeenCalled();
        expect(save).not.toHaveBeenCalled();
        expect(notification.open).not.toHaveBeenCalled();
    });

    it('投稿後の取り直しが失敗しても戻さない', async () => {
        await create();
        restore.mockClear();
        notification.open.mockClear();
        service['fetchSightingHistories'].mockImplementation(failLater);

        submit$.next();
        await jest.advanceTimersByTimeAsync(0);
        await jest.advanceTimersByTimeAsync(0);

        expect(restore).not.toHaveBeenCalled();
        expect(notification.open).toHaveBeenCalledWith(
            'データの取得に失敗しました',
            'OK',
        );
    });
});

describe('OperationRealTimeComponent をサーバーで描くとき', () => {
    it('中身を取らず、引き継がない', async () => {
        const fetchOperationGroups = jest.fn(() => of(undefined));
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeComponent],
            providers: [
                provideRouter([]),
                { provide: PLATFORM_ID, useValue: 'server' },
                {
                    provide: OperationRealTimeService,
                    useValue: { fetchOperationGroups },
                },
                {
                    provide: SocketService,
                    useValue: { on: () => new Subject() },
                },
                { provide: NotificationService, useValue: { open: jest.fn() } },
                {
                    provide: OperationPostCardService,
                    useValue: { submitEvent$: new Subject<void>() },
                },
            ],
        })
            .overrideComponent(OperationRealTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        const fixture = TestBed.createComponent(OperationRealTimeComponent);

        expect(fetchOperationGroups).not.toHaveBeenCalled();
        expect(fixture.nativeElement).toHaveAttribute('ngskiphydration');
    });
});
