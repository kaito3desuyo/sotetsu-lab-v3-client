import { provideHttpClient, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
    Router,
} from '@angular/router';
import { Subject, of } from 'rxjs';

import { NotificationService } from 'src/app/core/services/notification.service';
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
