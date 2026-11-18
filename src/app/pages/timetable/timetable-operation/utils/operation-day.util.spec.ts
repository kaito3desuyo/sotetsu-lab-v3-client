import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { TripOperationListWithTimesDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import {
    buildOperationDay,
    OperationDayInput,
    OperationDayRow,
} from './operation-day.util';

const BASE_DATE = '2026-11-16';
const OP = 'op63';

/** 'HH:mm' -> TimeDetailsDto 用（days は 1 始まり。24 時超えは days 2） */
function t(hm: string) {
    const [h, m] = hm.split(':').map(Number);
    const time = `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    const days = h >= 24 ? 2 : 1;
    return {
        timeId: `t-${hm}`,
        departureDays: days,
        departureTime: time,
        arrivalDays: days,
        arrivalTime: time,
    };
}

function tol(
    id: string,
    start: string,
    end: string,
    trip: { depotIn?: boolean; depotOut?: boolean } = {},
): TripOperationListWithTimesDto {
    return {
        tripOperationListId: id,
        tripId: `trip-${id}`,
        operationId: OP,
        startStationId: `s-${id}-start`,
        endStationId: `s-${id}-end`,
        startTime: t(start),
        endTime: t(end),
        trip: { tripId: `trip-${id}`, ...trip },
    } as TripOperationListWithTimesDto;
}

const TRIPS: OperationTripsDto = {
    operation: {
        operationId: OP,
        operationNumber: '63',
    } as OperationDetailsDto,
    trips: [
        tol('a', '06:00', '06:40', { depotOut: true }),
        tol('b', '07:00', '07:40'),
        tol('c', '08:00', '08:40', { depotIn: true }),
    ],
};

function sighting(
    id: string,
    formationId: string,
    hm: string,
    extra: Partial<OperationSightingDetailsDto> = {},
): OperationSightingDetailsDto {
    return {
        operationSightingId: id,
        formationId,
        operationId: OP,
        sightingTime: `${BASE_DATE}T${hm}:00+09:00`,
        ...extra,
    } as OperationSightingDetailsDto;
}

function input(partial: Partial<OperationDayInput>): OperationDayInput {
    return {
        operationId: OP,
        baseDate: BASE_DATE,
        trips: TRIPS,
        sightings: [],
        formationNumberById: { f1: '8708', f2: '10701' },
        inferredFormationNumber: null,
        ...partial,
    };
}

type TripRow = Extract<OperationDayRow, { kind: 'trip' }>;
const tripRows = (rows: OperationDayRow[]): TripRow[] =>
    rows.filter((r): r is TripRow => r.kind === 'trip');
const formations = (rows: OperationDayRow[]) =>
    tripRows(rows).map((r) => [r.formationNumber, r.inferred]);

describe('buildOperationDay', () => {
    it('目撃が無く推し量りも無ければ、どの列車も null', () => {
        const rows = buildOperationDay(input({}));
        expect(formations(rows)).toEqual([
            [null, false],
            [null, false],
            [null, false],
        ]);
        expect(rows.map((r) => r.kind)).toEqual([
            'depot',
            'trip',
            'trip',
            'trip',
            'depot',
        ]);
        expect(rows[0]).toEqual({
            kind: 'depot',
            label: 'out',
            stationId: 's-a-start',
            time: '06:00',
        });
    });

    it('今日で目撃が無ければ、推し量りの編成に inferred を付ける', () => {
        const rows = buildOperationDay(
            input({ inferredFormationNumber: '8708' }),
        );
        expect(formations(rows)).toEqual([
            ['8708', true],
            ['8708', true],
            ['8708', true],
        ]);
    });

    it('走行中の目撃は、その列車から', () => {
        const rows = buildOperationDay(
            input({ sightings: [sighting('s1', 'f1', '07:20')] }),
        );
        expect(formations(rows)).toEqual([
            [null, false],
            ['8708', false],
            ['8708', false],
        ]);
        expect(tripRows(rows)[1].sightingTimes).toEqual([
            `${BASE_DATE}T07:20:00+09:00`,
        ]);
        expect(tripRows(rows)[2].sightingTimes).toEqual([]);
    });

    it('列車の間の目撃は、次の列車から', () => {
        const rows = buildOperationDay(
            input({ sightings: [sighting('s1', 'f1', '07:50')] }),
        );
        expect(formations(rows)).toEqual([
            [null, false],
            [null, false],
            ['8708', false],
        ]);
        expect(tripRows(rows)[2].sightingTimes).toEqual([
            `${BASE_DATE}T07:50:00+09:00`,
        ]);
    });

    it('最初の列車より前の目撃は、最初の列車から', () => {
        const rows = buildOperationDay(
            input({ sightings: [sighting('s1', 'f1', '05:30')] }),
        );
        expect(formations(rows)).toEqual([
            ['8708', false],
            ['8708', false],
            ['8708', false],
        ]);
    });

    it('編成が替われば、後の編成の最初の列車の前に swap', () => {
        const rows = buildOperationDay(
            input({
                sightings: [
                    sighting('s2', 'f2', '07:20'),
                    sighting('s1', 'f1', '06:10'),
                ],
            }),
        );
        expect(rows.map((r) => r.kind)).toEqual([
            'depot',
            'trip',
            'swap',
            'trip',
            'trip',
            'depot',
        ]);
        expect(rows[2]).toEqual({
            kind: 'swap',
            sightingTime: `${BASE_DATE}T07:20:00+09:00`,
            toFormationNumber: '10701',
        });
        expect(formations(rows)).toEqual([
            ['8708', false],
            ['10701', false],
            ['10701', false],
        ]);
    });

    it('同じ編成が続けて目撃されても swap を出さない', () => {
        const rows = buildOperationDay(
            input({
                sightings: [
                    sighting('s1', 'f1', '06:10'),
                    sighting('s2', 'f1', '08:10'),
                ],
            }),
        );
        expect(rows.some((r) => r.kind === 'swap')).toBe(false);
        expect(tripRows(rows)[2].sightingTimes).toEqual([
            `${BASE_DATE}T08:10:00+09:00`,
        ]);
    });

    it('持ち越しの目撃は、最初の列車からの推し量りにし、swap に数えない', () => {
        const carried = sighting('c1', 'f1', '05:00', {
            sightingTime: '2026-11-15T22:00:00+09:00',
            sightedAsOperation: { operationId: 'op62', operationNumber: '62' },
        });
        const rows = buildOperationDay(
            input({
                sightings: [carried, sighting('s1', 'f2', '07:20')],
                inferredFormationNumber: null,
            }),
        );
        expect(formations(rows)).toEqual([
            ['8708', true],
            ['10701', false],
            ['10701', false],
        ]);
        expect(rows.some((r) => r.kind === 'swap')).toBe(false);
        expect(tripRows(rows)[0].sightingTimes).toEqual([]);
    });

    it('持ち越しの目撃は、time-cross-section の推し量りより先に使う', () => {
        const carried = sighting('c1', 'f1', '05:00', {
            carriedFromSightingId: 'orig',
        });
        const rows = buildOperationDay(
            input({ sightings: [carried], inferredFormationNumber: '10701' }),
        );
        expect(formations(rows)[0]).toEqual(['8708', true]);
    });

    it('持ち越しの写しの編成が食い違うときは、どの枠の写しか分からないので推し量りに使わない', () => {
        const morning = sighting('c1', 'f1', '05:00', {
            carriedFromSightingId: 'orig-1',
        });
        const later = sighting('c2', 'f2', '05:30', {
            carriedFromSightingId: 'orig-2',
        });
        const past = buildOperationDay(
            input({
                sightings: [morning, later],
                inferredFormationNumber: null,
            }),
        );
        expect(formations(past)[0]).toEqual([null, false]);

        const today = buildOperationDay(
            input({
                sightings: [morning, later],
                inferredFormationNumber: '8713',
            }),
        );
        expect(formations(today)[0]).toEqual(['8713', true]);
    });

    it('持ち越しの写しが何件あっても、編成が同じならその編成で推し量る', () => {
        const rows = buildOperationDay(
            input({
                sightings: [
                    sighting('c1', 'f1', '05:00', {
                        carriedFromSightingId: 'o1',
                    }),
                    sighting('c2', 'f1', '05:30', {
                        carriedFromSightingId: 'o2',
                    }),
                ],
            }),
        );
        expect(formations(rows)[0]).toEqual(['8708', true]);
    });

    it('無効にされた目撃は数えない', () => {
        const rows = buildOperationDay(
            input({
                sightings: [
                    sighting('s1', 'f1', '06:10'),
                    sighting('s2', 'f2', '07:20', {
                        invalidation: {
                            operationSightingInvalidationId: 'i',
                            operationSightingId: 's2',
                            createdAt: '',
                            updatedAt: '',
                        },
                    }),
                ],
            }),
        );
        expect(formations(rows)).toEqual([
            ['8708', false],
            ['8708', false],
            ['8708', false],
        ]);
        expect(rows.some((r) => r.kind === 'swap')).toBe(false);
    });

    it('ほかの運用の目撃は数えない', () => {
        const rows = buildOperationDay(
            input({
                sightings: [
                    sighting('s1', 'f1', '07:20', { operationId: 'op64' }),
                ],
            }),
        );
        expect(formations(rows)).toEqual([
            [null, false],
            [null, false],
            [null, false],
        ]);
    });

    it('知らない編成の目撃は、番号が分からないので null', () => {
        const rows = buildOperationDay(
            input({ sightings: [sighting('s1', 'fx', '06:10')] }),
        );
        expect(formations(rows)[0]).toEqual([null, false]);
    });

    it('列車を持たない運用（休車 100）は空の配列', () => {
        const rows = buildOperationDay(
            input({
                trips: {
                    operation: {
                        operationId: OP,
                        operationNumber: '100',
                    } as OperationDetailsDto,
                    trips: [],
                },
                sightings: [sighting('s1', 'f1', '07:20')],
            }),
        );
        expect(rows).toEqual([]);
    });

    it('ダイヤの形（baseDate null）は編成を決めない', () => {
        const rows = buildOperationDay(
            input({
                baseDate: null,
                sightings: [sighting('s1', 'f1', '07:20')],
                inferredFormationNumber: '8708',
            }),
        );
        expect(formations(rows)).toEqual([
            [null, false],
            [null, false],
            [null, false],
        ]);
        expect(tripRows(rows).every((r) => r.sightingTimes.length === 0)).toBe(
            true,
        );
    });

    it('列車は時刻順に並べる（24 時を超える列車も）', () => {
        const rows = buildOperationDay(
            input({
                trips: {
                    ...TRIPS,
                    trips: [
                        tol('z', '24:47', '25:04'),
                        tol('y', '23:00', '23:30'),
                    ],
                },
            }),
        );
        expect(tripRows(rows).map((r) => r.trip.tripOperationListId)).toEqual([
            'y',
            'z',
        ]);
    });
});
