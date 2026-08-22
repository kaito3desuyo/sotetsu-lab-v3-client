import { provideHttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY, firstValueFrom, of, throwError } from 'rxjs';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { TimetablePostCardService } from 'src/app/shared/timetable-post-card/services/timetable-post-card.service';
import { TimetableSearchCardService } from 'src/app/shared/timetable-search-card/services/timetable-search-card.service';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from './services/dashboard.service';
import { DashboardStore } from './stores/dashboard.store';

describe('DashboardComponent', () => {
    let component: DashboardComponent;
    let fixture: ComponentFixture<DashboardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DashboardComponent],
            providers: [
                provideHttpClient(),
                provideRouter([]),
                {
                    // 実 HTTP を発行させない（fetchData の未処理 Promise
                    // reject でワーカーが落ちるのを防ぐ）
                    provide: DashboardService,
                    useValue: {
                        fetchTodaysCalendar: () => of(undefined),
                        fetchRunningTripCount: () => of(undefined),
                        fetchTodaysSightings: () => of(undefined),
                        fetchLatestSightingPositions: () => of(undefined),
                    },
                },
            ],
        })
            .overrideComponent(DashboardComponent, {
                set: {
                    imports: [],
                    schemas: [NO_ERRORS_SCHEMA],
                    providers: [
                        {
                            provide: OperationSearchCardService,
                            useValue: {
                                receiveSearchOperationTableEvent: () => EMPTY,
                                receiveSearchOperationRouteDiagramEvent: () =>
                                    EMPTY,
                            },
                        },
                        {
                            provide: TimetableSearchCardService,
                            useValue: {
                                receiveSearchTimetableEvent: () => EMPTY,
                            },
                        },
                        {
                            provide: TimetablePostCardService,
                            useValue: {
                                receiveMoveTimetableAddEvent: () => EMPTY,
                            },
                        },
                    ],
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
