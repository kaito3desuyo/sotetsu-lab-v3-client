import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { NotificationService } from 'src/app/core/services/notification.service';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { OperationTableComponent } from './operation-table.component';
import { OperationTableService } from './services/operation-table.service';
import { OperationTableStore } from './stores/operation-table.store';

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
                    provide: CalendarListStateQuery,
                    useValue: { calendars$: of([]) },
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

        it('取得中は出さない（届く前に「登録されていません」と見せない）', () => {
            OperationTableStore.enableLoading();

            expect(component.isEmpty()).toBe(false);
        });

        it('取得が終わって 0 件なら出す', () => {
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
