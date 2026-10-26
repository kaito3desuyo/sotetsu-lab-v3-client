import { provideHttpClient, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom, of, switchMap, throwError, timer } from 'rxjs';
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from './services/dashboard.service';
import {
    DashboardSnapshot,
    DashboardStore,
    pickDashboardSettings,
} from './stores/dashboard.store';

describe('DashboardComponent', () => {
    let component: DashboardComponent;
    let fixture: ComponentFixture<DashboardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DashboardComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([]),
                {
                    provide: OfflineSnapshots,
                    useValue: {
                        save: () => Promise.resolve(),
                        restore: () => Promise.resolve(null),
                    },
                },
                {
                    // 実 HTTP を発行させない（fetchData の未処理 Promise
                    // reject でワーカーが落ちるのを防ぐ）
                    provide: DashboardService,
                    useValue: {
                        fetchTodaysCalendar: () => of(undefined),
                        fetchTodaysDayName: () => of(undefined),
                        fetchRunningTripCount: () => of(undefined),
                        fetchTodaysSightings: () => of(undefined),
                        fetchLatestSightingPositions: () => of(undefined),
                        fetchTripClasses: () => of(undefined),
                    },
                },
            ],
        })
            .overrideComponent(DashboardComponent, {
                set: {
                    imports: [],
                    schemas: [NO_ERRORS_SCHEMA],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(DashboardComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('ページコンテナ: 外周 gutter が段階的に広がるクラス列を持つ', () => {
        fixture.detectChanges();
        const main: HTMLElement = fixture.nativeElement.querySelector('main');
        // docs/design.md「余白の掟 1」。全ページの main がこの1本のクラス列を共有する。
        // 旧実装は md 以上が一律 tw-p-16（64px）で、768px では左右で画面の 17% を
        // 余白に使っていた。
        expect(main.classList).toContain('tw-p-4');
        expect(main.classList).toContain('md:tw-p-6');
        expect(main.classList).toContain('lg:tw-p-8');
        expect(main.classList).toContain('xl:tw-p-16');
        // スマホの横 gutter は 0 にしない（2026-08-22 にユーザー判断で撤回）。
        // 16px は Material の画面マージン既定と一致し、gutter の階段が
        // 16 → 24 → 32 → 64 と単調に並ぶ。
        expect(main.classList).not.toContain('max-sm:tw-px-0');
    });

    it('fetchData: フェッチが reject しても isLoading が回復する（try/finally）', async () => {
        // コンストラクタで走った初回 fetchData（成功モック）の完了を待つ
        await new Promise((resolve) => setTimeout(resolve, 0));

        const service = TestBed.inject(DashboardService) as {
            fetchRunningTripCount: () => unknown;
        };
        service.fetchRunningTripCount = () =>
            throwError(() => new Error('fetch failed'));

        await expect(component.fetchData()).rejects.toThrow('fetch failed');

        expect(await firstValueFrom(DashboardStore.isLoading$)).toBe(false);
    });
});

describe('DashboardComponent をサーバーで描くとき', () => {
    it('中身を取らない（枠だけ描く）', async () => {
        const fetchTodaysCalendar = jest.fn(() => of(undefined));
        await TestBed.configureTestingModule({
            imports: [DashboardComponent],
            providers: [
                provideRouter([]),
                { provide: PLATFORM_ID, useValue: 'server' },
                {
                    provide: DashboardService,
                    useValue: {
                        fetchTodaysCalendar,
                        fetchTodaysDayName: () => of(undefined),
                        fetchRunningTripCount: () => of(undefined),
                        fetchTodaysSightings: () => of(undefined),
                        fetchLatestSightingPositions: () => of(undefined),
                        fetchTripClasses: () => of(undefined),
                    },
                },
            ],
        })
            .overrideComponent(DashboardComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        TestBed.createComponent(DashboardComponent);

        expect(fetchTodaysCalendar).not.toHaveBeenCalled();
    });

    it('サーバーの HTML をブラウザで引き継がない（ngSkipHydration）', async () => {
        await TestBed.configureTestingModule({
            imports: [DashboardComponent],
            providers: [
                provideRouter([]),
                { provide: PLATFORM_ID, useValue: 'server' },
                { provide: DashboardService, useValue: {} },
            ],
        })
            .overrideComponent(DashboardComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        const fixture = TestBed.createComponent(DashboardComponent);

        expect(fixture.nativeElement).toHaveAttribute('ngskiphydration');
    });
});

describe('DashboardComponent の圏外の保存', () => {
    let fixture: ComponentFixture<DashboardComponent>;
    let component: DashboardComponent;
    let service: Record<string, jest.Mock>;
    const save = jest.fn(() => Promise.resolve());
    const restore = jest.fn();

    const flush = (ms = 10) =>
        new Promise((resolve) => setTimeout(resolve, ms));
    // 次のタスクで失敗する取得。すぐ失敗させると「処理されない拒否」と見なされ、
    // ComponentFixture が投げ直してしまう
    const failLater = (message: string, ms = 0) =>
        timer(ms).pipe(switchMap(() => throwError(() => new Error(message))));
    const succeedLater = (ms: number) =>
        timer(ms).pipe(switchMap(() => of(undefined)));

    const saved: DashboardSnapshot = {
        todaysCalendar: { calendarId: 'saved-cal' } as never,
        todaysDayName: '元日',
        runningTripCount: 12,
        sightingCountToday: 34,
        latestSightings: [{ operationSightingId: 'saved-s' }] as never,
        latestSightingPositions: { 'saved-s': { prev: null } } as never,
        itineraryLinks: [{ operationItineraryLinkId: 'saved-l' }] as never,
        tripClasses: [{ tripClassId: 'saved-t' }] as never,
    };

    beforeEach(async () => {
        // 前のテストで戻した中身が「取得済みの中身」として残らないように
        DashboardStore.setTodaysCalendar(null);
        save.mockClear();
        restore.mockReset();
        const ok = () => jest.fn(() => of(undefined));
        service = {
            fetchTodaysCalendar: ok(),
            fetchTodaysDayName: ok(),
            fetchTodaysSightings: ok(),
            fetchTripClasses: ok(),
            fetchRunningTripCount: ok(),
            fetchLatestSightingPositions: ok(),
        };
        await TestBed.configureTestingModule({
            imports: [DashboardComponent],
            providers: [
                provideRouter([]),
                { provide: DashboardService, useValue: service },
                { provide: OfflineSnapshots, useValue: { save, restore } },
            ],
        })
            .overrideComponent(DashboardComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(DashboardComponent);
        component = fixture.componentInstance;
        // コンストラクタの初回取得（成功）を終わらせてから確かめる
        await flush();
        save.mockClear();
    });

    it('成功したら条件と中身を保存する', async () => {
        DashboardStore.setTodaysDayName('保存する日');
        DashboardStore.setRunningTripCount(7);

        await component.fetchData();

        expect(save).toHaveBeenCalledTimes(1);
        const [params] = save.mock.calls[0] as unknown as [
            { key: string; conditions: unknown; data: DashboardSnapshot },
        ];
        expect(params.key).toBe('Dashboard');
        expect(params.conditions).toEqual({});
        expect(params.data.todaysDayName).toBe('保存する日');
        expect(params.data.runningTripCount).toBe(7);
        expect(Object.keys(params.data).sort()).toEqual(
            [
                'todaysCalendar',
                'todaysDayName',
                'runningTripCount',
                'sightingCountToday',
                'latestSightings',
                'latestSightingPositions',
                'itineraryLinks',
                'tripClasses',
            ].sort(),
        );
    });

    it('失敗したら保存した中身を戻し、失敗は投げ直す', async () => {
        service['fetchTripClasses'].mockImplementation(() =>
            failLater('offline'),
        );
        restore.mockImplementation(
            async (params: {
                apply: (data: DashboardSnapshot, savedAt: number) => void;
            }) => {
                params.apply(saved, 1_700_000_000_000);
                return { data: saved };
            },
        );

        await expect(component.fetchData()).rejects.toThrow('offline');

        expect(restore).toHaveBeenCalledTimes(1);
        expect(restore.mock.calls[0][0].key).toBe('Dashboard');
        expect(restore.mock.calls[0][0].conditions).toEqual({});
        expect(DashboardStore.snapshot()).toEqual(saved);
        expect(save).not.toHaveBeenCalled();
        expect(await firstValueFrom(DashboardStore.isLoading$)).toBe(false);
    });

    it('取得済みの中身があるときは、失敗しても保存した中身に戻さない', async () => {
        // 前の訪問や自動更新で、今の中身の方が新しい
        const fresh = { calendarId: 'fresh-cal' } as never;
        DashboardStore.setTodaysCalendar(fresh);
        service['fetchTripClasses'].mockImplementation(() =>
            failLater('offline'),
        );
        restore.mockImplementation(
            async (params: {
                apply: (data: DashboardSnapshot, savedAt: number) => void;
            }) => {
                params.apply(saved, 1_700_000_000_000);
                return { data: saved };
            },
        );

        await expect(component.fetchData()).rejects.toThrow('offline');

        expect(restore).not.toHaveBeenCalled();
        expect(DashboardStore.snapshot().todaysCalendar).toBe(fresh);
        expect(await firstValueFrom(DashboardStore.isLoading$)).toBe(false);
    });

    it('取得がすべて終わってから戻す（遅れて届く成功が戻した中身を上書きしない）', async () => {
        service['fetchTodaysCalendar'].mockImplementation(() =>
            failLater('offline'),
        );
        service['fetchTripClasses'].mockImplementation(() => succeedLater(40));
        restore.mockResolvedValue(null);

        const result = component.fetchData().catch((e: Error) => e.message);
        await flush(15);

        expect(restore).not.toHaveBeenCalled();

        expect(await result).toBe('offline');
        expect(restore).toHaveBeenCalledTimes(1);
    });

    it('2 本目の取得が失敗しても戻す', async () => {
        service['fetchRunningTripCount'].mockImplementation(() =>
            failLater('offline'),
        );
        restore.mockResolvedValue(null);

        await expect(component.fetchData()).rejects.toThrow('offline');

        expect(restore).toHaveBeenCalledTimes(1);
        expect(save).not.toHaveBeenCalled();
    });

    it('戻す処理が壊れていても、読み込み中を解いて元の失敗を投げる', async () => {
        service['fetchTodaysSightings'].mockImplementation(() =>
            failLater('offline'),
        );
        restore.mockRejectedValue(new Error('broken snapshot'));

        await expect(component.fetchData()).rejects.toThrow('offline');

        expect(await firstValueFrom(DashboardStore.isLoading$)).toBe(false);
    });
});

describe('pickDashboardSettings', () => {
    it('丸ごと保存の古い値を読み込んでも、既訪問フラグ以外はストアに入らない', () => {
        DashboardStore.setRunningTripCount(5);

        const picked = pickDashboardSettings({
            hasVisitedBefore: true,
            runningTripCount: 999,
            latestSightings: [{ operationSightingId: 'old' }],
            loadingQueue: [true],
        } as never);

        expect(picked.hasVisitedBefore).toBe(true);
        expect(picked.runningTripCount).toBe(5);
        expect(picked.latestSightings).toEqual(
            DashboardStore.snapshot().latestSightings,
        );
        expect(picked.loadingQueue).toEqual([]);
    });
});
