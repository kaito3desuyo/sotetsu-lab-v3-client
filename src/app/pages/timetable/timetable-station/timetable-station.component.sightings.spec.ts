import { provideHttpClient, withXhr } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
} from '@angular/router';
import { format } from 'date-fns';
import localForage from 'localforage';
import { Observable, of } from 'rxjs';

import { OFFLINE_SNAPSHOT_VERSION } from 'src/app/core/offline/offline-snapshots';
import { NotificationService } from 'src/app/core/services/notification.service';
import { getRailwayDate } from 'src/app/core/utils/railway-day';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { TimetableStationService } from './services/timetable-station.service';
import { TimetableStationStore } from './stores/timetable-station.store';
import { TimetableStationComponent } from './timetable-station.component';

jest.mock('localforage', () => ({
    __esModule: true,
    default: { getItem: jest.fn(), setItem: jest.fn() },
}));

describe('TimetableStationComponent の充当編成の圏外の保存', () => {
    const getItem = localForage.getItem as jest.Mock;
    const setItem = localForage.setItem as jest.Mock;
    const open = jest.fn();
    const SIGHTINGS_KEY = 'offline-snapshot:TimetableStationSightings';

    const crossSection = {
        operationNumber: '51',
    } as unknown as OperationSightingTimeCrossSectionDto;
    const today = () => format(getRailwayDate(new Date()), 'yyyy-MM-dd');
    const conditions = (date: string) => ({
        calendarId: 'cal-1',
        stationId: 'st-1',
        tripDirection: 0,
        date,
    });
    const savedSightings = (date: string) => ({
        version: OFFLINE_SNAPSHOT_VERSION,
        conditions: conditions(date),
        savedAt: new Date(2026, 9, 26, 21, 5).getTime(),
        data: { '51': crossSection },
    });

    let fixture: ComponentFixture<TimetableStationComponent>;
    // 充当編成の取得の結果（true: 取れた / false: 取れなかった）
    let sightingsFetched: Observable<boolean>;

    const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

    const setup = async () => {
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
                    provide: TodaysCalendarListStateQuery,
                    useValue: { todaysCalendarIds$: of(['cal-1']) },
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
                            sightingsFetched,
                    },
                },
                { provide: NotificationService, useValue: { open } },
            ],
        })
            .overrideComponent(TimetableStationComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();
    };

    const sightingsSaves = () =>
        setItem.mock.calls.filter(([key]) => key === SIGHTINGS_KEY);

    beforeEach(() => {
        jest.resetAllMocks();
        setItem.mockResolvedValue(undefined);
        getItem.mockResolvedValue(null);
    });

    afterEach(() => {
        fixture.destroy();
        TimetableStationStore.resetOperationSightingTimeCrossSections();
        TimetableStationStore.setHasFetchedTimetable(false);
        TimetableStationStore.resetLoading();
    });

    it('充当編成が取れたら保存する', async () => {
        sightingsFetched = new Observable<boolean>((subscriber) => {
            TimetableStationStore.setOperationSightingTimeCrossSection(
                '51',
                crossSection,
            );
            subscriber.next(true);
            subscriber.complete();
        });
        await setup();

        fixture = TestBed.createComponent(TimetableStationComponent);
        await flush();

        expect(sightingsSaves()).toHaveLength(1);
        const [, saved] = sightingsSaves()[0];
        expect(saved).toMatchObject({
            version: OFFLINE_SNAPSHOT_VERSION,
            conditions: conditions(today()),
            data: { '51': crossSection },
        });
        expect(open).not.toHaveBeenCalled();
    });

    it('充当編成が取れなかったら、今日保存した充当編成を戻して知らせる', async () => {
        sightingsFetched = of(false);
        getItem.mockImplementation((key: string) =>
            Promise.resolve(
                key === SIGHTINGS_KEY ? savedSightings(today()) : null,
            ),
        );
        await setup();

        fixture = TestBed.createComponent(TimetableStationComponent);
        await flush();

        expect(
            TimetableStationStore.operationSightingTimeCrossSections,
        ).toEqual({ '51': crossSection });
        expect(open).toHaveBeenCalledTimes(1);
        expect(open).toHaveBeenCalledWith(
            expect.stringContaining('に保存した内容を表示しています'),
            'OK',
        );
        expect(sightingsSaves()).toHaveLength(0);
        expect(fixture.componentInstance.isLoading()).toBe(false);
    });

    it('日付が違う保存は戻さない', async () => {
        sightingsFetched = of(false);
        getItem.mockImplementation((key: string) =>
            Promise.resolve(
                key === SIGHTINGS_KEY ? savedSightings('2000-01-01') : null,
            ),
        );
        await setup();

        fixture = TestBed.createComponent(TimetableStationComponent);
        await flush();

        expect(
            TimetableStationStore.operationSightingTimeCrossSections,
        ).toEqual({});
        expect(open).not.toHaveBeenCalled();
        expect(fixture.componentInstance.isLoading()).toBe(false);
    });

    it('戻す処理が壊れていても読み込みを解く', async () => {
        sightingsFetched = of(false);
        getItem.mockImplementation((key: string) =>
            key === SIGHTINGS_KEY
                ? Promise.reject(new Error('broken'))
                : Promise.resolve(null),
        );
        await setup();

        fixture = TestBed.createComponent(TimetableStationComponent);
        await flush();

        expect(fixture.componentInstance.isLoading()).toBe(false);
    });
});
