import { TestBed } from '@angular/core/testing';
import { lastValueFrom, of, Subject, throwError } from 'rxjs';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TimetableOperationStore } from '../stores/timetable-operation.store';
import { TimetableOperationService } from './timetable-operation.service';

const op63 = { operationId: 'op63', operationNumber: '63', calendarId: 'c1' };
const op64 = { operationId: 'op64', operationNumber: '64', calendarId: 'c1' };
const trips63 = {
    operation: op63,
    trips: [
        {
            tripOperationListId: 'a',
            tripId: 'trip-a',
            operationId: 'op63',
            startTime: { departureDays: 1, departureTime: '06:00:00' },
            endTime: { arrivalDays: 1, arrivalTime: '07:00:00' },
            trip: { tripId: 'trip-a' },
        },
    ],
};
const sighting = (formationId: string, operationId = 'op63') => ({
    operationSightingId: `s-${formationId}`,
    formationId,
    operationId,
    sightingTime: '2026-11-16T06:30:00+09:00',
});

describe('Service: TimetableOperation', () => {
    let service: TimetableOperationService;
    let store: InstanceType<typeof TimetableOperationStore>;
    const calendarService = {
        findOneBySpecificDate: jest.fn(),
        findOne: jest.fn(),
    };
    const formationService = { findManyBySpecificDate: jest.fn() };
    const operationService = {
        findManyByCalendarId: jest.fn(),
        findOneWithTrips: jest.fn(),
        findOneWithCurrentPosition: jest.fn(),
        findManyItineraryLinks: jest.fn(),
    };
    const tripBlockService = { findManyByCalendarId: jest.fn() };
    const sightingService = {
        findManyBySpecificPeriod: jest.fn(),
        findOneTimeCrossSectionByOperationNumber: jest.fn(),
    };

    beforeEach(() => {
        jest.resetAllMocks();
        calendarService.findOneBySpecificDate.mockReturnValue(
            of({ calendarId: 'c1' }),
        );
        calendarService.findOne.mockReturnValue(of({ calendarId: 'c2' }));
        formationService.findManyBySpecificDate.mockReturnValue(
            of([
                { formationId: 'f1', formationNumber: '8708' },
                { formationId: 'f2', formationNumber: '10701' },
            ]),
        );
        operationService.findManyByCalendarId.mockReturnValue(of([op63, op64]));
        operationService.findOneWithTrips.mockReturnValue(of(trips63));
        operationService.findManyItineraryLinks.mockReturnValue(of([]));
        tripBlockService.findManyByCalendarId.mockReturnValue(
            of({
                0: [
                    {
                        trips: [
                            {
                                tripId: 'trip-a',
                                times: [
                                    { timeId: 't2', stopSequence: 2 },
                                    { timeId: 't1', stopSequence: 1 },
                                ],
                            },
                        ],
                    },
                ],
            }),
        );
        sightingService.findManyBySpecificPeriod.mockReturnValue(of([]));
        sightingService.findOneTimeCrossSectionByOperationNumber.mockReturnValue(
            of({
                expectedSighting: { formation: { formationNumber: '8708' } },
            }),
        );
        TestBed.configureTestingModule({
            providers: [
                TimetableOperationService,
                { provide: CalendarService, useValue: calendarService },
                { provide: FormationService, useValue: formationService },
                { provide: OperationService, useValue: operationService },
                { provide: TripBlockService, useValue: tripBlockService },
                {
                    provide: OperationSightingService,
                    useValue: sightingService,
                },
            ],
        });
        service = TestBed.inject(TimetableOperationService);
        store = TestBed.inject(TimetableOperationStore);
    });

    const byDate = (
        viewKind: 'past' | 'today',
        operationNumber = '63',
        date = '2026-11-16',
    ) =>
        lastValueFrom(
            service.fetch({
                operationNumber,
                date,
                calendarId: null,
                viewKind,
            }),
        );

    it('日付の形: 日付からダイヤを引き、その番号の運用の列車と目撃を入れる', async () => {
        sightingService.findManyBySpecificPeriod.mockReturnValue(
            of([sighting('f1')]),
        );
        await byDate('past');
        expect(calendarService.findOneBySpecificDate).toHaveBeenCalledWith(
            expect.objectContaining({ date: '2026-11-16' }),
        );
        expect(operationService.findManyByCalendarId).toHaveBeenCalledWith(
            expect.objectContaining({ calendarId: 'c1' }),
        );
        expect(operationService.findOneWithTrips).toHaveBeenCalledWith(
            expect.objectContaining({ operationId: 'op63' }),
        );
        expect(sightingService.findManyBySpecificPeriod).toHaveBeenCalledWith(
            expect.objectContaining({
                from: '2026-11-16',
                to: '2026-11-16',
                includeCarriedOver: true,
            }),
        );
        expect(store.operation()?.operationId).toBe('op63');
        expect(store.operationNumbers()).toEqual(['63', '64']);
        const tripRow = store.rows().find((r) => r.kind === 'trip');
        expect(tripRow).toEqual(
            expect.objectContaining({
                formationNumber: '8708',
                inferred: false,
            }),
        );
        // 各駅の時刻は trip-block から付け、停車順に並べる
        expect(
            store.trips()?.trips[0].trip?.times?.map((t) => t.timeId),
        ).toEqual(['t1', 't2']);
        expect(store.loaded()).toBe(true);
    });

    it('今日で目撃が無ければ time-cross-section の編成番号を inferredFormationNumber に入れる', async () => {
        await byDate('today');
        expect(
            sightingService.findOneTimeCrossSectionByOperationNumber,
        ).toHaveBeenCalledWith(
            expect.objectContaining({ operationNumber: '63' }),
        );
        expect(store.inferredFormationNumber()).toBe('8708');
        expect(store.rows().find((r) => r.kind === 'trip')).toEqual(
            expect.objectContaining({
                formationNumber: '8708',
                inferred: true,
            }),
        );
    });

    it('今日でもこの運用に目撃があれば time-cross-section を呼ばない', async () => {
        sightingService.findManyBySpecificPeriod.mockReturnValue(
            of([sighting('f1')]),
        );
        await byDate('today');
        expect(
            sightingService.findOneTimeCrossSectionByOperationNumber,
        ).not.toHaveBeenCalled();
    });

    it('ほかの運用の目撃しか無ければ、今日は time-cross-section を呼ぶ', async () => {
        sightingService.findManyBySpecificPeriod.mockReturnValue(
            of([sighting('f1', 'op64')]),
        );
        await byDate('today');
        expect(
            sightingService.findOneTimeCrossSectionByOperationNumber,
        ).toHaveBeenCalled();
    });

    it('過去の日は time-cross-section を呼ばない', async () => {
        await byDate('past');
        expect(
            sightingService.findOneTimeCrossSectionByOperationNumber,
        ).not.toHaveBeenCalled();
        expect(store.inferredFormationNumber()).toBeNull();
    });

    it('ダイヤの形: calendarId のダイヤで引き、目撃を取らない', async () => {
        await lastValueFrom(
            service.fetch({
                operationNumber: '63',
                date: null,
                calendarId: 'c2',
                viewKind: 'calendar',
            }),
        );
        expect(calendarService.findOne).toHaveBeenCalledWith(
            expect.objectContaining({ calendarId: 'c2' }),
        );
        expect(calendarService.findOneBySpecificDate).not.toHaveBeenCalled();
        expect(sightingService.findManyBySpecificPeriod).not.toHaveBeenCalled();
        expect(
            sightingService.findOneTimeCrossSectionByOperationNumber,
        ).not.toHaveBeenCalled();
        expect(operationService.findManyByCalendarId).toHaveBeenCalledWith(
            expect.objectContaining({ calendarId: 'c2' }),
        );
        expect(store.rows().find((r) => r.kind === 'trip')).toEqual(
            expect.objectContaining({ formationNumber: null }),
        );
    });

    it('ダイヤの、運番が変わるつながりを取って乗り移りの行にする', async () => {
        operationService.findManyItineraryLinks.mockReturnValue(
            of([
                {
                    tripOperationListId: 'a',
                    tripId: 'trip-a',
                    operationId: 'op63',
                    previous: null,
                    next: {
                        tripOperationListId: 'x',
                        tripId: 'trip-x',
                        operationId: 'op64',
                        operationNumber: '64',
                        stationId: 'st1',
                        rule: 2,
                    },
                },
            ]),
        );
        await byDate('past');
        expect(operationService.findManyItineraryLinks).toHaveBeenCalledWith(
            expect.objectContaining({ calendarId: 'c1' }),
        );
        expect(store.rows().at(-1)).toEqual({
            kind: 'transfer',
            from: '63',
            to: '64',
            stationId: 'st1',
        });
    });

    it('つながりの取得に失敗したら loadError で、列車は出す', async () => {
        operationService.findManyItineraryLinks.mockReturnValue(
            throwError(() => new Error('x')),
        );
        await byDate('past');
        expect(store.loadError()).toBe(true);
        expect(store.rows().some((r) => r.kind === 'trip')).toBe(true);
    });

    it('その番号の運用が無ければ notFound で、エラーにしない', async () => {
        await byDate('past', '99');
        expect(store.notFound()).toBe(true);
        expect(store.loadError()).toBe(false);
        expect(operationService.findOneWithTrips).not.toHaveBeenCalled();
        // 運用番号の欄の候補は出す
        expect(store.operationNumbers()).toEqual(['63', '64']);
    });

    it('ダイヤが無い日は noCalendar', async () => {
        calendarService.findOneBySpecificDate.mockReturnValue(of(null));
        await byDate('past');
        expect(store.noCalendar()).toBe(true);
        expect(store.notFound()).toBe(false);
    });

    it('取得に失敗したら loadError', async () => {
        operationService.findOneWithTrips.mockReturnValue(
            throwError(() => new Error('x')),
        );
        await byDate('past');
        expect(store.loadError()).toBe(true);
        expect(store.notFound()).toBe(false);
    });

    it('refetchSightings は過去の日とダイヤの形では何もしない', async () => {
        await byDate('past');
        sightingService.findManyBySpecificPeriod.mockClear();
        await lastValueFrom(service.refetchSightings());
        expect(sightingService.findManyBySpecificPeriod).not.toHaveBeenCalled();
    });

    it('refetchSightings は今日なら目撃だけを取り直す', async () => {
        await byDate('today');
        sightingService.findManyBySpecificPeriod.mockReturnValue(
            of([sighting('f2')]),
        );
        operationService.findOneWithTrips.mockClear();
        await lastValueFrom(service.refetchSightings());
        expect(
            sightingService.findManyBySpecificPeriod,
        ).toHaveBeenLastCalledWith(
            expect.objectContaining({ forceReload: true }),
        );
        expect(operationService.findOneWithTrips).not.toHaveBeenCalled();
        expect(store.rows().find((r) => r.kind === 'trip')).toEqual(
            expect.objectContaining({ formationNumber: '10701' }),
        );
    });

    it('古い取得の結果は捨てる（世代番号）', async () => {
        const slow = new Subject<unknown>();
        calendarService.findOneBySpecificDate.mockReturnValueOnce(slow);
        const first = lastValueFrom(
            service.fetch({
                operationNumber: '63',
                date: '2026-11-15',
                calendarId: null,
                viewKind: 'past',
            }),
        );
        await byDate('past', '64');
        slow.next({ calendarId: 'old' });
        slow.complete();
        await first;
        expect(store.operationNumber()).toBe('64');
        expect(store.calendar()?.calendarId).toBe('c1');
    });

    it('fetchCurrentPosition は今日だけ取る', async () => {
        operationService.findOneWithCurrentPosition.mockReturnValue(
            of({ operationId: 'op63' }),
        );
        await byDate('past');
        await lastValueFrom(service.fetchCurrentPosition());
        expect(
            operationService.findOneWithCurrentPosition,
        ).not.toHaveBeenCalled();
        await byDate('today');
        await lastValueFrom(service.fetchCurrentPosition());
        expect(
            operationService.findOneWithCurrentPosition,
        ).toHaveBeenCalledWith(
            expect.objectContaining({ operationId: 'op63' }),
        );
        expect(store.currentPosition()).toEqual({ operationId: 'op63' });
    });
});
