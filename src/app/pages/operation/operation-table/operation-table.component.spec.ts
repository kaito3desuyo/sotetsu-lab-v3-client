import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { EMPTY, of } from 'rxjs';

import { NotificationService } from 'src/app/core/services/notification.service';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
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
                        fetchOperationGroups: () => of(undefined),
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
        OperationTableStore.setOperationGroups([]);
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

    it('onJump: 対象要素が無くても例外を投げない', () => {
        createComponent();
        expect(() => component.onJump('999')).not.toThrow();
    });

    it('groupNameFor: 運用番号が属する群の実データ群名をそのまま解決する', () => {
        OperationTableStore.setOperationGroups([
            { groupName: '9G群', operationNumbers: ['31'] },
        ]);
        createComponent();

        expect(component.groupNameFor('31')).toBe('9G群');
    });

    it('groupNameFor: 休車（運用番号100）は疑似グループ「休」を解決する', () => {
        OperationTableStore.setOperationGroups([
            { groupName: '9G群', operationNumbers: ['31'] },
        ]);
        createComponent();

        expect(component.groupNameFor('100')).toBe('休');
    });

    it('groupNameFor: 未解決なら undefined を返す（バッジ非表示）', () => {
        OperationTableStore.setOperationGroups([
            { groupName: '9G群', operationNumbers: ['31'] },
        ]);
        createComponent();

        expect(component.groupNameFor('999')).toBeUndefined();
    });
});
