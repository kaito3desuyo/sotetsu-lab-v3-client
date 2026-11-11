import { TestBed } from '@angular/core/testing';
import { from, lastValueFrom, of, throwError } from 'rxjs';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import { TimetableFormationStore } from '../stores/timetable-formation.store';
import { TimetableFormationService } from './timetable-formation.service';

const formation = {
    formationId: 'f1',
    formationNumber: '10708',
    startDate: '2020-01-01',
    endDate: null,
} as never;

const tripsOf = (operationId: string, tol: string[] = []) =>
    ({
        operation: { operationId, operationNumber: operationId },
        trips: tol.map((id) => ({
            tripOperationListId: id,
            startTime: { departureDays: 1, departureTime: '06:00:00' },
            endTime: { arrivalDays: 1, arrivalTime: '07:00:00' },
        })),
    }) as never;

describe('Service: TimetableFormation', () => {
    let service: TimetableFormationService;
    let store: InstanceType<typeof TimetableFormationStore>;
    const calendarService = { findOneBySpecificDate: jest.fn() };
    const formationService = { findManyBySpecificDate: jest.fn() };
    const stationService = { findMany: jest.fn() };
    const operationService = {
        findOneWithTrips: jest.fn(),
        findManyItineraryLinks: jest.fn(),
        findOneWithCurrentPosition: jest.fn(),
    };
    const sightingService = {
        findManyBySpecificPeriod: jest.fn(),
        findOneTimeCrossSectionByFormationNumber: jest.fn(),
    };

    beforeEach(() => {
        jest.resetAllMocks();
        calendarService.findOneBySpecificDate.mockReturnValue(
            of({ calendarId: 'c1' }),
        );
        formationService.findManyBySpecificDate.mockReturnValue(
            of([formation]),
        );
        stationService.findMany.mockReturnValue(of([]));
        operationService.findManyItineraryLinks.mockReturnValue(of([]));
        operationService.findOneWithTrips.mockImplementation(
            ({ operationId }: { operationId: string }) =>
                of(tripsOf(operationId)),
        );
        sightingService.findManyBySpecificPeriod.mockReturnValue(of([]));
        sightingService.findOneTimeCrossSectionByFormationNumber.mockReturnValue(
            of({ expectedSighting: null }),
        );
        TestBed.configureTestingModule({
            providers: [
                TimetableFormationService,
                { provide: CalendarService, useValue: calendarService },
                { provide: FormationService, useValue: formationService },
                { provide: StationService, useValue: stationService },
                { provide: OperationService, useValue: operationService },
                {
                    provide: OperationSightingService,
                    useValue: sightingService,
                },
            ],
        });
        service = TestBed.inject(TimetableFormationService);
        store = TestBed.inject(TimetableFormationStore);
    });

    const run = (
        date: string,
        dateKind: 'past' | 'today' | 'tomorrow',
        formationNumber = '10708',
    ) => lastValueFrom(service.fetchDay({ formationNumber, date, dateKind }));

    it('ダイヤが無い日は noCalendar', async () => {
        calendarService.findOneBySpecificDate.mockReturnValue(of(null));
        await run('2026-11-11', 'today');
        expect(store.noCalendar()).toBe(true);
        expect(store.rows()).toEqual([]);
    });

    it('その日に有効な編成が無ければ notFound', async () => {
        formationService.findManyBySpecificDate.mockReturnValue(of([]));
        await run('2026-11-11', 'today');
        expect(store.notFound()).toBe(true);
        expect(store.noCalendar()).toBe(false);
    });

    it('過去の日は includeCarriedOver=true でその日の 4 時から翌日の 4 時を取る', async () => {
        await run('2026-11-01', 'past');
        expect(sightingService.findManyBySpecificPeriod).toHaveBeenCalledWith(
            expect.objectContaining({
                from: '2026-11-01',
                to: '2026-11-01',
                includeCarriedOver: true,
            }),
        );
        expect(
            sightingService.findOneTimeCrossSectionByFormationNumber,
        ).not.toHaveBeenCalled();
    });

    it('明日は searchTime に明日 12:00 を渡す', async () => {
        sightingService.findOneTimeCrossSectionByFormationNumber.mockReturnValue(
            of({ expectedSighting: { operation: { operationId: 'op-9' } } }),
        );
        await run('2026-11-12', 'tomorrow');
        expect(
            sightingService.findOneTimeCrossSectionByFormationNumber,
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                formationNumber: '10708',
                searchTime: '2026-11-12T12:00:00+09:00',
            }),
        );
        expect(store.firstOperationId()).toBe('op-9');
        expect(sightingService.findManyBySpecificPeriod).not.toHaveBeenCalled();
    });

    it('今日で目撃が無ければ time-cross-section の運用を最初の運用にする', async () => {
        sightingService.findOneTimeCrossSectionByFormationNumber.mockImplementation(
            ({ searchTime }: { searchTime?: string }) =>
                of({
                    expectedSighting: {
                        operation: {
                            operationId: searchTime ? 'op-tomorrow' : 'op-now',
                        },
                    },
                }),
        );
        await run('2026-11-11', 'today');
        expect(store.firstOperationId()).toBe('op-now');
        expect(store.tomorrowOperationId()).toBe('op-tomorrow');
        expect(store.canSelectTomorrow()).toBe(true);
    });

    it('乗り移り先の運用の列車を取り終えるまで findOneWithTrips を呼ぶ', async () => {
        sightingService.findOneTimeCrossSectionByFormationNumber.mockReturnValue(
            of({ expectedSighting: { operation: { operationId: 'op-a' } } }),
        );
        operationService.findManyItineraryLinks.mockReturnValue(
            of([
                {
                    tripOperationListId: 'a1',
                    tripId: 't',
                    operationId: 'op-a',
                    previous: null,
                    next: {
                        tripOperationListId: 'b1',
                        tripId: 't2',
                        operationId: 'op-b',
                        operationNumber: 'op-b',
                        stationId: 's',
                        rule: 1,
                    },
                },
            ]),
        );
        operationService.findOneWithTrips.mockImplementation(
            ({ operationId }: { operationId: string }) =>
                of(
                    operationId === 'op-a'
                        ? tripsOf('op-a', ['a1'])
                        : tripsOf('op-b', ['b1']),
                ),
        );
        await run('2026-11-12', 'tomorrow');
        const ids = operationService.findOneWithTrips.mock.calls.map(
            (c) => c[0].operationId,
        );
        expect(ids).toEqual(['op-a', 'op-b']);
        expect(store.rows().filter((r) => r.kind === 'trip').length).toBe(2);
    });

    it('API が返さない運用を同じ id で二度取りに行かない', async () => {
        sightingService.findOneTimeCrossSectionByFormationNumber.mockReturnValue(
            of({ expectedSighting: { operation: { operationId: 'op-x' } } }),
        );
        operationService.findOneWithTrips.mockReturnValue(of(null));
        await run('2026-11-12', 'tomorrow');
        expect(operationService.findOneWithTrips).toHaveBeenCalledTimes(1);
    });

    it('明日の運用が返らなければ canSelectTomorrow は false', async () => {
        await run('2026-11-11', 'today');
        expect(store.tomorrowOperationId()).toBeNull();
        expect(store.canSelectTomorrow()).toBe(false);
    });

    it('古い取得の結果は捨てる', async () => {
        let release!: (v: unknown) => void;
        const slow = new Promise((r) => (release = r));
        formationService.findManyBySpecificDate.mockReturnValueOnce(from(slow));
        const first = run('2026-11-10', 'past');
        formationService.findManyBySpecificDate.mockReturnValue(
            of([formation]),
        );
        await run('2026-11-11', 'today');
        release([]);
        await first;
        expect(store.date()).toBe('2026-11-11');
        expect(store.formation()).not.toBeNull();
        expect(store.notFound()).toBe(false);
    });

    it('refetchSightings は今日の目撃だけを取り直す', async () => {
        await run('2026-11-11', 'today');
        sightingService.findManyBySpecificPeriod.mockClear();
        calendarService.findOneBySpecificDate.mockClear();
        await lastValueFrom(service.refetchSightings());
        expect(sightingService.findManyBySpecificPeriod).toHaveBeenCalledWith(
            expect.objectContaining({ forceReload: true }),
        );
        expect(calendarService.findOneBySpecificDate).not.toHaveBeenCalled();
    });

    it('fetchCurrentPosition は運用の id で位置を取る', async () => {
        await run('2026-11-11', 'today');
        operationService.findOneWithCurrentPosition.mockReturnValue(
            of({ operation: { operationId: 'op-1' } }),
        );
        await lastValueFrom(service.fetchCurrentPosition('op-1'));
        expect(
            operationService.findOneWithCurrentPosition,
        ).toHaveBeenCalledWith(
            expect.objectContaining({ operationId: 'op-1' }),
        );
        expect(store.currentPosition()).not.toBeNull();
    });

    it('fetchCurrentPosition は失敗しても null にしてエラーにしない', async () => {
        await run('2026-11-11', 'today');
        operationService.findOneWithCurrentPosition.mockReturnValue(
            throwError(() => new Error('x')),
        );
        await lastValueFrom(service.fetchCurrentPosition('op-1'));
        expect(store.currentPosition()).toBeNull();
    });
});
