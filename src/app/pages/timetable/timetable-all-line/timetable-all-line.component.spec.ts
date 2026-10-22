import { provideHttpClient, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
    Router,
} from '@angular/router';
import { EMPTY, of, ReplaySubject } from 'rxjs';

import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
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
                    useValue: { selectByCalendarId: () => of(undefined) },
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
                    useValue: { selectByCalendarId: () => of(undefined) },
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
    let tripBlocks$: ReplaySubject<undefined>;

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const query = (selector: string) =>
        (fixture.nativeElement as HTMLElement).querySelector(selector);

    const setup = async (params: Record<string, string>) => {
        tripBlocks$ = new ReplaySubject<undefined>(1);
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
                        fetchTripBlocks: () => tripBlocks$,
                    },
                },
                {
                    provide: CalendarListStateQuery,
                    useValue: { selectByCalendarId: () => of(undefined) },
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
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
        fixture = TestBed.createComponent(TimetableAllLineComponent);
        fixture.detectChanges();
    };

    afterEach(() => {
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

    it('ダイヤが無ければ骨組みを出さない（検索カードだけ）', async () => {
        await setup({});

        expect(query('[data-testid="all-line-table-skeleton"]')).toBeNull();
        expect(query('app-timetable-search-card')).not.toBeNull();
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

        await setup({ calendar_id: 'cal-1', trip_direction: '0' });

        expect(query('[data-testid="all-line-table-skeleton"]')).not.toBeNull();
    });
});
