import { Component } from '@angular/core';
import {
    ComponentFixture,
    ComponentFixtureAutoDetect,
    TestBed,
} from '@angular/core/testing';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
} from '@angular/router';
import { EMPTY, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { NotificationService } from 'src/app/core/services/notification.service';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { SegmentToggleComponent } from 'src/app/shared/segment-toggle/segment-toggle.component';
import { TimetableSearchCardService } from 'src/app/shared/timetable-search-card/services/timetable-search-card.service';
import { TimetableSearchCardStateStore } from 'src/app/shared/timetable-search-card/states/timetable-search-card.state';
import { TimetableStationTableComponent } from './components/timetable-station-table/timetable-station-table.component';
import { TimetableStationService } from './services/timetable-station.service';
import { TimetableStationStore } from './stores/timetable-station.store';
import { TimetableStationComponent } from './timetable-station.component';

/**
 * T6.8 再差し戻し回帰テスト: リロード相当の初回フェッチ（実際の解決順序・
 * 非同期遅延つき）の後、**追加操作なしで**充当編成が描画されることを検証する。
 * ルートコンポーネント→実ストア→実テーブル→実セルを実描画で通す。
 */
const CAL = 'cal-2026-weekday';
const YOKOHAMA = 'st-yokohama';

const calendarDto = {
    calendarId: CAL,
    calendarName: '平日ダイヤ',
    startDate: '2026-03-14',
    monday: true,
    saturday: false,
    sunday: false,
} as never;

const makeTrip = (
    tripId: string,
    tripNumber: string,
    operationId: string,
    minute: string,
) =>
    ({
        tripId,
        tripNumber,
        tripClassId: 'class-local',
        tripDirection: 0,
        tripBlockId: `block-${tripId}`,
        times: [
            {
                timeId: `tm-${tripId}`,
                stationId: YOKOHAMA,
                stopSequence: 10,
                pickupType: 0,
                dropoffType: 0,
                arrivalTime: `06:${minute}:00`,
                arrivalDays: 1,
                departureTime: null,
                departureDays: null,
            },
        ],
        tripOperationLists: [{ operationId }],
    }) as never;

const trip1 = makeTrip('trip-1', '6001', 'op-1', '45');
const trip2 = makeTrip('trip-2', '6003', 'op-2', '55');

const makeCrossSection = (
    operationId: string,
    operationNumber: string,
    formationNumber: string,
) =>
    ({
        latestSighting: { sightingTime: new Date().toISOString() },
        expectedSighting: {
            operation: { operationId, operationNumber },
            formation: {
                formationId: `f-${formationNumber}`,
                formationNumber,
            },
        },
    }) as never;

@Component({ selector: 'app-timetable-search-card-c', template: '' })
class StubSearchCardComponent {}

@Component({ selector: 'ng-adsense', template: '' })
class StubAdsenseComponent {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function setup(overrides?: {
    operationSighting?: unknown;
    tripBlock?: unknown;
}): Promise<ComponentFixture<TimetableStationComponent>> {
    await TestBed.configureTestingModule({
        imports: [TimetableStationComponent],
        providers: [
            provideRouter([]),
            { provide: ComponentFixtureAutoDetect, useValue: true },
            TimetableStationService,
            TimetableSearchCardStateStore,
            {
                provide: ActivatedRoute,
                useValue: {
                    paramMap: of(
                        convertToParamMap({
                            calendar_id: CAL,
                            station_id: YOKOHAMA,
                            trip_direction: '0',
                        }),
                    ),
                },
            },
            {
                provide: TimetableSearchCardService,
                useValue: { receiveSearchTimetableEvent: () => EMPTY },
            },
            { provide: NotificationService, useValue: { open: () => {} } },
            {
                provide: TodaysCalendarListStateQuery,
                useValue: {
                    todaysCalendarIds$: of([CAL]),
                    todaysCalendarId: CAL,
                },
            },
            {
                provide: CalendarListStateQuery,
                useValue: { calendars$: of([calendarDto]) },
            },
            {
                provide: RouteStationListStateQuery,
                useValue: {
                    stations$: of([
                        { stationId: YOKOHAMA, stationName: '横浜' },
                    ]),
                    routeStations$: of([]),
                },
            },
            // ---- libs モック（初回ロードの実解決順序・非同期性をエミュレート） ----
            {
                provide: CalendarService,
                useValue: { findOne: () => of(calendarDto).pipe(delay(1)) },
            },
            {
                provide: TripClassService,
                useValue: {
                    findMany: () =>
                        of([
                            {
                                tripClassId: 'class-local',
                                tripClassName: '各停',
                                tripClassColor: '#808080',
                            },
                        ]).pipe(delay(1)),
                },
            },
            {
                provide: StationService,
                useValue: {
                    findMany: () =>
                        of([{ stationId: YOKOHAMA, stationName: '横浜' }]).pipe(
                            delay(1),
                        ),
                },
            },
            {
                provide: OperationService,
                useValue: {
                    findManyByCalendarId: () =>
                        of([
                            { operationId: 'op-1', operationNumber: '51' },
                            { operationId: 'op-2', operationNumber: '52' },
                        ]).pipe(delay(1)),
                },
            },
            {
                provide: TripBlockService,
                useValue: overrides?.tripBlock ?? {
                    findManyByFilter: () =>
                        of([
                            { tripBlockId: 'block-trip-1', trips: [trip1] },
                            { tripBlockId: 'block-trip-2', trips: [trip2] },
                        ]).pipe(delay(30)),
                },
            },
            {
                provide: OperationSightingService,
                useValue: overrides?.operationSighting ?? {
                    findManyTimeCrossSectionsByOperationNumbers: () =>
                        of({
                            '51': makeCrossSection('op-1', '51', '10708'),
                            '52': makeCrossSection('op-2', '52', '21101'),
                        }).pipe(delay(10)),
                },
            },
        ],
    })
        .overrideComponent(TimetableStationComponent, {
            set: {
                imports: [
                    MatFormFieldModule,
                    MatProgressBarModule,
                    MatSelectModule,
                    DateFnsPipe,
                    ControlBandComponent,
                    EmptyStateComponent,
                    SegmentToggleComponent,
                    TimetableStationTableComponent,
                    StubSearchCardComponent,
                    StubAdsenseComponent,
                ],
            },
        })
        .compileComponents();

    return TestBed.createComponent(TimetableStationComponent);
}

describe('TimetableStationComponent 統合（初回ロードの表示モデル再構築）', () => {
    beforeEach(() => {
        // ストアはモジュールシングルトンのため、前テストのクロスセクションを持ち越さない
        TimetableStationStore.resetOperationSightingTimeCrossSections();
    });

    it('初回フェッチ解決後、追加操作なしで全セルに充当編成が描画される', async () => {
        const fixture = await setup();

        // fetchData の全 await（calendar・運行・種別・駅・運用を並行 → crossSections）が
        // 実時間で解決するのを待つ
        await sleep(300);
        fixture.detectChanges();

        const text = (fixture.nativeElement as HTMLElement).textContent;
        expect(text).toContain('10708');
        expect(text).toContain('21101');
        expect(text).not.toContain('不明');
    });

    it('まとめて返る結果に無い運用だけが「不明」になり、他の充当編成は描画される', async () => {
        const fixture = await setup({
            operationSighting: {
                findManyTimeCrossSectionsByOperationNumbers: () =>
                    of({
                        '52': makeCrossSection('op-2', '52', '21101'),
                    }).pipe(delay(10)),
            },
        });

        await sleep(300);
        fixture.detectChanges();

        const text = (fixture.nativeElement as HTMLElement).textContent;
        // 結果に無い運用（51）のみ「不明」、ある運用（52）は編成表示
        expect(text).toContain('21101');
        expect(text).toContain('不明');
    });

    it('列車の行は方向ごとの運行 1 本の取得から作る（駅ごとの列車一覧は取らない）', async () => {
        const findManyByFilter = jest.fn(() =>
            of([
                { tripBlockId: 'block-trip-1', trips: [trip1] },
                { tripBlockId: 'block-trip-2', trips: [trip2] },
            ]).pipe(delay(30)),
        );
        const fixture = await setup({ tripBlock: { findManyByFilter } });

        await sleep(300);
        fixture.detectChanges();

        const text = (fixture.nativeElement as HTMLElement).textContent;
        expect(findManyByFilter).toHaveBeenCalledTimes(1);
        expect(text).toContain('6001');
        expect(text).toContain('6003');
    });
});
