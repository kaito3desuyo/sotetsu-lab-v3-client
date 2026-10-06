import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { EMPTY, of, throwError } from 'rxjs';

import { NotificationService } from 'src/app/core/services/notification.service';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationSearchCardStateStore } from 'src/app/shared/operation-search-card/states/operation-search-card.state';
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
                    },
                },
                {
                    provide: OperationSearchCardService,
                    useValue: {
                        receiveSearchOperationTableEvent: () => EMPTY,
                        receiveSearchOperationRouteDiagramEvent: () => EMPTY,
                    },
                },
                {
                    provide: OperationSearchCardStateStore,
                    useValue: { setCalendarId: () => {} },
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

    it('placeholderHeight: 見出しと余白 63px + 列車 32px + つなぎの行 8px', () => {
        createComponent();
        const trip = (tripDirection: number, depotIn = false) => ({
            trip: { tripDirection, depotIn, depotOut: false },
        });

        // 上り → 上り（つなぎ）→ 下り（折り返し）→ 下りで入庫（つなぎ）→ 下り（入庫後なのでつながない）
        const operationTrip = {
            trips: [trip(0), trip(0), trip(1), trip(1, true), trip(1)],
        } as unknown as OperationTripsDto;

        expect(component.placeholderHeight(operationTrip)).toBe(
            63 + 5 * 32 + 2 * 8,
        );
    });

    it('isCardVisible: 選択した群の運用だけを出す', () => {
        OperationTableStore.setSelectedGroupNames(['7群']);
        createComponent();

        expect(component.isCardVisible('79')).toBe(true);
        expect(component.isCardVisible('11')).toBe(false);
    });
});
