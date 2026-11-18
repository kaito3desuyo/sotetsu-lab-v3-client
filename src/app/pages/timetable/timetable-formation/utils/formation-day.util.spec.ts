import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import {
    OperationSightingDetailsDto,
    OperationSightingInvalidationDetailsDto,
} from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import {
    ItineraryLinkEndDto,
    OperationItineraryLinkDto,
} from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { TripOperationListWithTimesDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import {
    basisAt,
    buildFormationDay,
    dropCarriedCopies,
    FormationDayInput,
    FormationDayRow,
    missingOperationIds,
    operationChain,
} from './formation-day.util';

const BASE_DATE = '2026-11-11';

/** 'HH:mm' -> TimeDetailsDto 用（days は 1 始まり。24 時超えは days 2） */
function t(hm: string) {
    const [h, m] = hm.split(':').map(Number);
    return {
        timeId: `t-${hm}`,
        departureDays: h >= 24 ? 2 : 1,
        departureTime: `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
        arrivalDays: h >= 24 ? 2 : 1,
        arrivalTime: `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
    };
}

function tol(
    id: string,
    operationId: string,
    start: string,
    end: string,
    trip: { depotIn?: boolean; depotOut?: boolean } = {},
): TripOperationListWithTimesDto {
    return {
        tripOperationListId: id,
        tripId: `trip-${id}`,
        operationId,
        startStationId: `s-${id}-start`,
        endStationId: `s-${id}-end`,
        startTime: t(start),
        endTime: t(end),
        trip: { tripId: `trip-${id}`, ...trip },
    } as TripOperationListWithTimesDto;
}

function op(
    operationId: string,
    operationNumber: string,
    trips: TripOperationListWithTimesDto[],
): OperationTripsDto {
    return {
        operation: { operationId, operationNumber } as OperationDetailsDto,
        trips,
    };
}

function jst(hm: string): string {
    return `${BASE_DATE}T${hm}:00+09:00`;
}

function sighting(
    id: string,
    formationId: string,
    operationId: string,
    hm: string,
    extra: Partial<OperationSightingDetailsDto> = {},
): OperationSightingDetailsDto {
    return {
        operationSightingId: id,
        formationId,
        operationId,
        sightingTime: jst(hm),
        ...extra,
    } as OperationSightingDetailsDto;
}

/** 前=prevTol の運用の最後の列車、次=nextTol（別の運用の最初の列車）の運番変更 */
function link(
    from: TripOperationListWithTimesDto,
    to: TripOperationListWithTimesDto,
    fromNumber: string,
    toNumber: string,
): OperationItineraryLinkDto[] {
    return [
        {
            tripOperationListId: from.tripOperationListId,
            tripId: from.tripId,
            operationId: from.operationId,
            previous: null,
            next: {
                tripOperationListId: to.tripOperationListId,
                tripId: to.tripId,
                operationId: to.operationId,
                operationNumber: toNumber,
                stationId: 'st-transfer',
                rule: 1,
            },
        },
        {
            tripOperationListId: to.tripOperationListId,
            tripId: to.tripId,
            operationId: to.operationId,
            previous: {
                tripOperationListId: from.tripOperationListId,
                tripId: from.tripId,
                operationId: from.operationId,
                operationNumber: fromNumber,
                stationId: 'st-transfer',
                rule: 1,
            },
            next: null,
        },
    ];
}

function input(partial: Partial<FormationDayInput>): FormationDayInput {
    return {
        formationId: 'f1',
        baseDate: BASE_DATE,
        sightings: [],
        firstOperationId: null,
        tripsByOperationId: {},
        links: [],
        ...partial,
    };
}

/** 行を短い文字列にして並びを比べやすくする */
function summarize(rows: FormationDayRow[]): string[] {
    return rows.map((r) => {
        switch (r.kind) {
            case 'trip':
                return `trip:${r.trip.tripOperationListId}${r.estimated ? '?' : ''}`;
            case 'depot':
                return `depot:${r.label}`;
            case 'transfer':
                return `transfer:${r.from}>${r.to}`;
            case 'swap':
                return `swap:${r.toOperationNumber}`;
            case 'unknown':
                return `unknown:${r.lastOperationNumber}`;
        }
    });
}

describe('buildFormationDay', () => {
    const a1 = tol('a1', 'op16', '08:00', '09:00');
    const a2 = tol('a2', 'op16', '09:30', '10:30');
    const b1 = tol('b1', 'op15', '11:00', '12:00');
    const b2 = tol('b2', 'op15', '12:30', '13:30');
    const trips = {
        op16: op('op16', '16K', [a2, a1]),
        op15: op('op15', '15K', [b2, b1]),
    };

    it('目撃が無ければ firstOperationId の列車を時刻順に並べる', () => {
        const rows = buildFormationDay(
            input({ firstOperationId: 'op16', tripsByOperationId: trips }),
        );
        expect(summarize(rows)).toEqual(['trip:a1', 'trip:a2']);
        expect(rows[0]).toMatchObject({
            kind: 'trip',
            operationId: 'op16',
            operationNumber: '16K',
            estimated: false,
        });
    });

    it('9:06 の目撃は days=1 の 9:00〜9:30 の列車に当たる', () => {
        const m1 = tol('m1', 'op55', '07:00', '08:00');
        const m2 = tol('m2', 'op55', '09:00', '09:30');
        const n1 = tol('n1', 'op59', '07:00', '08:00');
        const n2 = tol('n2', 'op59', '09:00', '09:30');
        const rows = buildFormationDay(
            input({
                sightings: [
                    sighting('s1', 'f1', 'op55', '07:30'),
                    sighting('s2', 'f1', 'op59', '09:06'),
                ],
                tripsByOperationId: {
                    op55: op('op55', '55', [m1, m2]),
                    op59: op('op59', '59', [n1, n2]),
                },
            }),
        );
        // 9:06 を含むのは m2（9:00〜9:30）なので、そこから 59 の n2 に替わる
        expect(summarize(rows)).toEqual(['trip:m1', 'swap:59', 'trip:n2']);
    });

    it('目撃の時刻を、その時刻を含む同じ運用の列車に付ける', () => {
        const m1 = tol('m1', 'op55', '07:00', '08:00');
        const m2 = tol('m2', 'op55', '09:00', '09:30');
        const n1 = tol('n1', 'op59', '07:00', '08:00');
        const n2 = tol('n2', 'op59', '09:00', '09:30');
        const rows = buildFormationDay(
            input({
                sightings: [
                    sighting('s1', 'f1', 'op55', '07:30'),
                    sighting('s2', 'f1', 'op59', '09:06'),
                    sighting('s3', 'f1', 'op59', '09:20'),
                ],
                tripsByOperationId: {
                    op55: op('op55', '55', [m1, m2]),
                    op59: op('op59', '59', [n1, n2]),
                },
            }),
        );
        const marks = rows.flatMap((r) =>
            r.kind === 'trip'
                ? [[r.trip.tripOperationListId, r.sightingTimes]]
                : [],
        );
        expect(marks).toEqual([
            ['m1', [jst('07:30')]],
            ['n2', [jst('09:06'), jst('09:20')]],
        ]);
    });

    it('自分の目撃がある列車は、次の差し替えの前でも推定にしない', () => {
        const m = ['07:00', '09:00', '10:00'].map((h, i) =>
            tol(`m${i + 1}`, 'op55', h, h.replace(':00', ':30')),
        );
        const n = ['07:00', '09:00', '10:00'].map((h, i) =>
            tol(`n${i + 1}`, 'op59', h, h.replace(':00', ':30')),
        );
        const rows = buildFormationDay(
            input({
                sightings: [
                    sighting('s1', 'f1', 'op55', '07:10'),
                    sighting('s2', 'f1', 'op59', '09:06'),
                    sighting('s3', 'f1', 'op55', '10:10'),
                ],
                tripsByOperationId: {
                    op55: op('op55', '55', m),
                    op59: op('op59', '59', n),
                },
            }),
        );
        const n2 = rows.find(
            (r) => r.kind === 'trip' && r.trip.tripOperationListId === 'n2',
        );
        expect(n2).toMatchObject({
            estimated: false,
            sightingTimes: [jst('09:06')],
        });
    });

    it('運番変更で 16K から 15K に続け、transfer の帯を入れる', () => {
        const rows = buildFormationDay(
            input({
                firstOperationId: 'op16',
                tripsByOperationId: trips,
                links: link(a2, b1, '16K', '15K'),
            }),
        );
        expect(summarize(rows)).toEqual([
            'trip:a1',
            'trip:a2',
            'transfer:16K>15K',
            'trip:b1',
            'trip:b2',
        ]);
        expect(rows[2]).toMatchObject({ stationId: 'st-transfer' });
        expect(
            rows.every((r) => r.kind !== 'trip' || r.estimated === false),
        ).toBe(true);
    });

    it('15:00 に 15K で目撃され、ダイヤで 16K から 15K に移るなら、朝は 16K', () => {
        const rows = buildFormationDay(
            input({
                sightings: [sighting('s1', 'f1', 'op15', '11:30')],
                tripsByOperationId: trips,
                links: link(a2, b1, '16K', '15K'),
            }),
        );
        expect(summarize(rows)).toEqual([
            'trip:a1',
            'trip:a2',
            'transfer:16K>15K',
            'trip:b1',
            'trip:b2',
        ]);
    });

    it('15:40 に 59 で目撃されたら、その時刻を含む列車から 59 に替え、swap の帯を入れる', () => {
        const c1 = tol('c1', 'op59', '14:00', '15:00');
        const c2 = tol('c2', 'op59', '15:30', '16:30');
        const c3 = tol('c3', 'op59', '17:00', '18:00');
        const op55 = op('op55', '55', [
            tol('d1', 'op55', '08:00', '09:00'),
            tol('d2', 'op55', '15:10', '16:10'),
            tol('d3', 'op55', '16:40', '17:40'),
        ]);
        const rows = buildFormationDay(
            input({
                sightings: [
                    sighting('s1', 'f1', 'op55', '08:30'),
                    sighting('s2', 'f1', 'op59', '15:40'),
                ],
                tripsByOperationId: {
                    op55,
                    op59: op('op59', '59', [c1, c2, c3]),
                },
            }),
        );
        // 15:40 を含むのは 55 の d2（15:10〜16:10）。そこから 59 の c2（15:30〜16:30）に替わる
        expect(summarize(rows)).toEqual([
            'trip:d1',
            'swap:59',
            'trip:c2',
            'trip:c3',
        ]);
        expect(rows[1]).toMatchObject({
            kind: 'swap',
            sightingTime: jst('15:40'),
            toOperationNumber: '59',
        });
    });

    it('目撃と目撃の間の列車は estimated', () => {
        const op55 = op('op55', '55', [
            tol('d1', 'op55', '08:00', '09:00'),
            tol('d2', 'op55', '10:00', '11:00'),
            tol('d3', 'op55', '12:00', '13:00'),
            tol('d4', 'op55', '15:10', '16:10'),
        ]);
        const op59 = op('op59', '59', [tol('c1', 'op59', '15:30', '16:30')]);
        const rows = buildFormationDay(
            input({
                sightings: [
                    sighting('s1', 'f1', 'op55', '08:30'),
                    sighting('s2', 'f1', 'op59', '15:40'),
                ],
                tripsByOperationId: { op55, op59 },
            }),
        );
        expect(summarize(rows)).toEqual([
            'trip:d1',
            'trip:d2?',
            'trip:d3?',
            'swap:59',
            'trip:c1',
        ]);
    });

    it('15:20 に 8711 が 55 で目撃され、この編成に新しい目撃が無ければ unknown の行を置く', () => {
        const op55 = op('op55', '55', [
            tol('d1', 'op55', '08:00', '09:00'),
            tol('d2', 'op55', '15:00', '16:00'),
            tol('d3', 'op55', '16:30', '17:30'),
        ]);
        const rows = buildFormationDay(
            input({
                sightings: [
                    sighting('s1', 'f1', 'op55', '08:30'),
                    sighting('s2', 'f2', 'op55', '15:20', {
                        formation: {
                            formationId: 'f2',
                            formationNumber: '8711',
                        } as FormationDetailsDto,
                    }),
                ],
                tripsByOperationId: { op55 },
            }),
        );
        expect(summarize(rows)).toEqual(['trip:d1', 'unknown:55']);
        expect(rows[1]).toEqual({
            kind: 'unknown',
            lastOperationNumber: '55',
            evictedBy: { formationNumber: '8711', sightingTime: jst('15:20') },
        });
    });

    it('目撃の一覧は編成を付けて返さないので、unknown の行の編成番号は formationNumberById から引く', () => {
        const op55 = op('op55', '55', [
            tol('d1', 'op55', '08:00', '09:00'),
            tol('d2', 'op55', '15:00', '16:00'),
        ]);
        const rows = buildFormationDay(
            input({
                sightings: [
                    sighting('s1', 'f1', 'op55', '08:30'),
                    sighting('s2', 'f2', 'op55', '15:20'),
                ],
                tripsByOperationId: { op55 },
                formationNumberById: { f1: '9702', f2: '10701' },
            }),
        );
        expect(rows[1]).toEqual({
            kind: 'unknown',
            lastOperationNumber: '55',
            evictedBy: { formationNumber: '10701', sightingTime: jst('15:20') },
        });
    });

    describe('自分の目撃と目撃の間で別の編成に追い出された', () => {
        const f2 = {
            formationId: 'f2',
            formationNumber: '10701',
        } as FormationDetailsDto;
        const op63 = (withDepot: boolean) =>
            op('op63', '63', [
                tol('e1', 'op63', '06:14', '09:33', { depotOut: true }),
                tol('e2', 'op63', '09:40', '10:00', {
                    depotIn: withDepot,
                }),
                tol('e3', 'op63', '14:17', '15:00', { depotOut: withDepot }),
                tol('e4', 'op63', '15:30', '17:53'),
            ]);
        const op69 = op('op69', '69', [
            tol('g1', 'op69', '17:50', '18:30'),
            tol('g2', 'op69', '18:40', '19:30', { depotIn: true }),
        ]);

        it('入庫を挟む運用は、最後の入庫の列車までを推定で残して不明を入れる', () => {
            const rows = buildFormationDay(
                input({
                    sightings: [
                        sighting('s1', 'f1', 'op63', '06:50'),
                        sighting('s2', 'f2', 'op63', '14:21', {
                            formation: f2,
                        }),
                        sighting('s3', 'f1', 'op69', '18:00'),
                    ],
                    tripsByOperationId: { op63: op63(true), op69 },
                }),
            );
            expect(summarize(rows)).toEqual([
                'depot:out',
                'trip:e1',
                'trip:e2?',
                'depot:in',
                'unknown:63',
                'swap:69',
                'trip:g1',
                'trip:g2',
                'depot:in',
            ]);
            const u = rows.find((r) => r.kind === 'unknown');
            expect(u).toEqual({
                kind: 'unknown',
                lastOperationNumber: '63',
                evictedBy: {
                    formationNumber: '10701',
                    sightingTime: jst('14:21'),
                },
            });
        });

        it('入庫を挟まなければ、追い出した目撃の列車の手前で切る', () => {
            const rows = buildFormationDay(
                input({
                    sightings: [
                        sighting('s1', 'f1', 'op63', '06:50'),
                        sighting('s2', 'f2', 'op63', '14:21', {
                            formation: f2,
                        }),
                        sighting('s3', 'f1', 'op69', '18:00'),
                    ],
                    tripsByOperationId: { op63: op63(false), op69 },
                }),
            );
            expect(summarize(rows)).toEqual([
                'depot:out',
                'trip:e1',
                'trip:e2?',
                'unknown:63',
                'swap:69',
                'trip:g1',
                'trip:g2',
                'depot:in',
            ]);
        });

        it('別の編成の目撃が違う運用なら何も変わらない', () => {
            const rows = buildFormationDay(
                input({
                    sightings: [
                        sighting('s1', 'f1', 'op63', '06:50'),
                        sighting('s2', 'f2', 'op69', '14:21', {
                            formation: f2,
                        }),
                        sighting('s3', 'f1', 'op69', '18:00'),
                    ],
                    tripsByOperationId: { op63: op63(true), op69 },
                }),
            );
            expect(rows.some((r) => r.kind === 'unknown')).toBe(false);
            expect(summarize(rows)).toContain('swap:69');
            expect(summarize(rows)).toContain('trip:e3?');
        });
    });

    it('運番変更で同じ運用に戻っても止まる', () => {
        // A(a1) -> B(b1) -> A(a1) の輪
        const x1 = tol('x1', 'opA', '08:00', '09:00');
        const y1 = tol('y1', 'opB', '09:30', '10:30');
        const rows = buildFormationDay(
            input({
                firstOperationId: 'opA',
                tripsByOperationId: {
                    opA: op('opA', 'A', [x1]),
                    opB: op('opB', 'B', [y1]),
                },
                links: [
                    ...link(x1, y1, 'A', 'B'),
                    {
                        tripOperationListId: 'y1',
                        tripId: 'trip-y1',
                        operationId: 'opB',
                        previous: null,
                        next: {
                            tripOperationListId: 'x1',
                            tripId: 'trip-x1',
                            operationId: 'opA',
                            operationNumber: 'A',
                            stationId: 'st-loop',
                            rule: 1,
                        },
                    },
                ],
            }),
        );
        expect(summarize(rows).filter((s) => s.startsWith('trip:'))).toEqual([
            'trip:x1',
            'trip:y1',
        ]);
    });

    it('不明の行の運用番号は、追い出した目撃の運用にそろえる', () => {
        // 16K で目撃 → ダイヤで 15K に運番変更 → 8711 が 15K で目撃
        const rows = buildFormationDay(
            input({
                sightings: [
                    sighting('s1', 'f1', 'op16', '08:30'),
                    sighting('s2', 'f2', 'op15', '11:30', {
                        formation: {
                            formationId: 'f2',
                            formationNumber: '8711',
                        } as FormationDetailsDto,
                    }),
                ],
                tripsByOperationId: trips,
                links: link(a2, b1, '16K', '15K'),
            }),
        );
        expect(summarize(rows)).toEqual(['trip:a1', 'trip:a2', 'unknown:15K']);
        expect(rows[2]).toMatchObject({
            kind: 'unknown',
            lastOperationNumber: '15K',
            evictedBy: { formationNumber: '8711', sightingTime: jst('11:30') },
        });
    });

    it('previous をさかのぼって輪になっても止まる', () => {
        // A(x1) ← B(y1) ← A(x1) の輪
        const x1 = tol('x1', 'opA', '08:00', '09:00');
        const y1 = tol('y1', 'opB', '09:30', '10:30');
        const end = (
            t: TripOperationListWithTimesDto,
            operationNumber: string,
        ): ItineraryLinkEndDto => ({
            tripOperationListId: t.tripOperationListId,
            tripId: t.tripId,
            operationId: t.operationId,
            operationNumber,
            stationId: 'st-loop',
            rule: 1,
        });
        const rows = buildFormationDay(
            input({
                firstOperationId: 'opA',
                tripsByOperationId: {
                    opA: op('opA', 'A', [x1]),
                    opB: op('opB', 'B', [y1]),
                },
                links: [
                    {
                        tripOperationListId: 'x1',
                        tripId: 'trip-x1',
                        operationId: 'opA',
                        previous: end(y1, 'B'),
                        next: null,
                    },
                    {
                        tripOperationListId: 'y1',
                        tripId: 'trip-y1',
                        operationId: 'opB',
                        previous: end(x1, 'A'),
                        next: null,
                    },
                ],
            }),
        );
        const tripIds = rows.flatMap((r) =>
            r.kind === 'trip' ? [r.trip.tripOperationListId] : [],
        );
        expect(new Set(tripIds).size).toBe(tripIds.length);
        expect([...tripIds].sort()).toEqual(['x1', 'y1']);
    });

    it('無効にされた目撃は使わない', () => {
        const rows = buildFormationDay(
            input({
                firstOperationId: 'op16',
                sightings: [
                    sighting('s1', 'f1', 'op15', '11:30', {
                        invalidation: {
                            operationSightingInvalidationId: 'inv',
                            operationSightingId: 's1',
                        } as OperationSightingInvalidationDetailsDto,
                    }),
                    sighting('s2', 'f2', 'op16', '12:00', {
                        invalidation: {
                            operationSightingInvalidationId: 'inv2',
                            operationSightingId: 's2',
                        } as OperationSightingInvalidationDetailsDto,
                    }),
                ],
                tripsByOperationId: trips,
            }),
        );
        // 15K の目撃は無効、別の編成の目撃も無効なので unknown にもならない
        expect(summarize(rows)).toEqual(['trip:a1', 'trip:a2']);
    });

    it('入出庫と日中の一時入庫を depot の行にする', () => {
        const e1 = tol('e1', 'op16', '05:00', '06:00', { depotOut: true });
        const e2 = tol('e2', 'op16', '12:00', '13:00', { depotIn: true });
        const e3 = tol('e3', 'op16', '14:00', '15:00', { depotOut: true });
        const e4 = tol('e4', 'op16', '24:10', '24:50', { depotIn: true });
        const rows = buildFormationDay(
            input({
                firstOperationId: 'op16',
                tripsByOperationId: {
                    op16: op('op16', '16K', [e1, e2, e3, e4]),
                },
            }),
        );
        expect(summarize(rows)).toEqual([
            'depot:out',
            'trip:e1',
            'trip:e2',
            'depot:in',
            'depot:out',
            'trip:e3',
            'trip:e4',
            'depot:in',
        ]);
        expect(rows[0]).toEqual({
            kind: 'depot',
            label: 'out',
            stationId: 's-e1-start',
            time: '05:00',
        });
        expect(rows[7]).toEqual({
            kind: 'depot',
            label: 'in',
            stationId: 's-e4-end',
            time: '00:50',
        });
    });

    it('引き継ぎの目撃は operationId の運用を使い carriedOver を付ける', () => {
        const rows = buildFormationDay(
            input({
                sightings: [
                    sighting('s1', 'f1', 'o-12', '08:30', {
                        sightedAsOperation: {
                            operationId: 'o-11',
                            operationNumber: '11K',
                        },
                    }),
                ],
                tripsByOperationId: {
                    'o-11': op('o-11', '11K', [
                        tol('p1', 'o-11', '08:00', '09:00'),
                    ]),
                    'o-12': op('o-12', '12K', [
                        tol('q1', 'o-12', '08:00', '09:00'),
                    ]),
                },
            }),
        );
        expect(summarize(rows)).toEqual(['trip:q1']);
        expect(rows[0]).toMatchObject({
            operationId: 'o-12',
            operationNumber: '12K',
            carriedOver: true,
            estimated: false,
        });
    });

    it('最初の目撃がその運用の最後の列車より後でも、昼の運番変更より前は前の運用', () => {
        const c1 = tol('c1', 'op15', '11:00', '12:00');
        const c2 = tol('c2', 'op15', '12:30', '13:30');
        const c3 = tol('c3', 'op15', '14:00', '15:00');
        const rows = buildFormationDay(
            input({
                sightings: [sighting('s1', 'f1', 'op15', '20:00')],
                tripsByOperationId: {
                    op16: trips.op16,
                    op15: op('op15', '15K', [c1, c2, c3]),
                },
                links: link(a2, c2, '16K', '15K'),
            }),
        );
        expect(summarize(rows)).toEqual([
            'trip:a1',
            'trip:a2',
            'transfer:16K>15K',
            'trip:c2',
            'trip:c3',
        ]);
    });

    describe('同日引き継ぎの写し', () => {
        /** api が返す写し: id は `元の id#運番`、元の id が carriedFromSightingId に付き、operationId と sightedAsOperation だけが違う */
        const copyOf = (
            original: OperationSightingDetailsDto,
            operationId: string,
            operationNumber: string,
            from: { operationId: string; operationNumber: string },
        ): OperationSightingDetailsDto => ({
            ...original,
            operationSightingId: `${original.operationSightingId}#${operationNumber}`,
            carriedFromSightingId: original.operationSightingId,
            operationId,
            operation: { operationId, operationNumber } as OperationDetailsDto,
            sightedAsOperation: from,
        });

        it('写しは id の形でなく carriedFromSightingId で見分ける', () => {
            const original = sighting('s1', 'f1', 'op16', '09:00');
            const copy = {
                ...copyOf(original, 'op15', '15K', {
                    operationId: 'op16',
                    operationNumber: '16K',
                }),
                operationSightingId: 'copy-without-hash',
            };
            const orphanCopy = {
                ...copy,
                operationSightingId: 'orphan-copy',
                carriedFromSightingId: 's-missing',
            };
            const hashedDirect = sighting('s2#x', 'f1', 'op16', '10:00');
            expect(
                dropCarriedCopies([original, copy, orphanCopy, hashedDirect]),
            ).toEqual([original, orphanCopy, hashedDirect]);
        });

        it('前向き: 16K の目撃と 15K の写しがあっても、16K → 15K に運番変更するだけで swap は出ない', () => {
            const original = sighting('s1', 'f1', 'op16', '09:00');
            const rows = buildFormationDay(
                input({
                    sightings: [
                        original,
                        copyOf(original, 'op15', '15K', {
                            operationId: 'op16',
                            operationNumber: '16K',
                        }),
                    ],
                    tripsByOperationId: trips,
                    links: link(a2, b1, '16K', '15K'),
                }),
            );
            expect(summarize(rows)).toEqual([
                'trip:a1',
                'trip:a2',
                'transfer:16K>15K',
                'trip:b1',
                'trip:b2',
            ]);
            expect(rows.every((r) => r.kind !== 'trip' || !r.carriedOver)).toBe(
                true,
            );
        });

        it('後ろ向き: 15K の目撃と 16K の写しがあっても、朝は 16K で引き継ぎにならない', () => {
            const original = sighting('s1', 'f1', 'op15', '11:30');
            const rows = buildFormationDay(
                input({
                    sightings: [
                        original,
                        copyOf(original, 'op16', '16K', {
                            operationId: 'op15',
                            operationNumber: '15K',
                        }),
                    ],
                    tripsByOperationId: trips,
                    links: link(a2, b1, '16K', '15K'),
                }),
            );
            expect(summarize(rows)).toEqual([
                'trip:a1',
                'trip:a2',
                'transfer:16K>15K',
                'trip:b1',
                'trip:b2',
            ]);
            expect(rows.every((r) => r.kind !== 'trip' || !r.carriedOver)).toBe(
                true,
            );
            rows.forEach((r, i) => {
                if (r.kind !== 'trip') return;
                expect(['sighting', 'transfer']).toContain(
                    basisAt(rows, i, 'sighting'),
                );
            });
        });
    });

    it('missingOperationIds は運番変更した先で trips の無い運用を返す', () => {
        const base = input({
            firstOperationId: 'op16',
            tripsByOperationId: { op16: trips.op16 },
            links: link(a2, b1, '16K', '15K'),
        });
        expect(missingOperationIds(base)).toEqual(['op15']);
        expect(
            missingOperationIds({
                ...base,
                tripsByOperationId: trips,
            }),
        ).toEqual([]);
    });
});

describe('basisAt', () => {
    const trip = (carriedOver = false) =>
        ({
            kind: 'trip',
            carriedOver,
            estimated: false,
            operationId: 'o',
            operationNumber: '1',
            trip: {},
        }) as never as FormationDayRow;
    const transfer = {
        kind: 'transfer',
        from: '1',
        to: '2',
        stationId: 's',
    } as FormationDayRow;
    const swap = {
        kind: 'swap',
        sightingTime: 't',
        toOperationNumber: '2',
    } as FormationDayRow;
    const unknown = {
        kind: 'unknown',
        lastOperationNumber: '1',
        evictedBy: { formationNumber: '9', sightingTime: 't' },
    } as FormationDayRow;

    it('決め手が無ければ firstBasis', () => {
        expect(basisAt([trip(), trip()], 1, 'circulated')).toBe('circulated');
        expect(basisAt([trip()], 0, 'sighting')).toBe('sighting');
    });
    it('直前の決め手が運番変更なら transfer', () => {
        expect(basisAt([trip(), transfer, trip()], 2, 'circulated')).toBe(
            'transfer',
        );
    });
    it('引き継ぎで決まった列車は carried-over', () => {
        expect(basisAt([trip(true), trip(true)], 1, 'carried-over')).toBe(
            'carried-over',
        );
        expect(basisAt([trip(), transfer, trip(true)], 2, 'circulated')).toBe(
            'carried-over',
        );
    });
    it('直前の決め手が swap なら sighting（運番変更より後の swap が勝つ）', () => {
        expect(basisAt([trip(), transfer, swap, trip()], 3, 'circulated')).toBe(
            'sighting',
        );
    });
    it('unknown の行以降は unknown', () => {
        expect(basisAt([trip(), unknown], 1, 'sighting')).toBe('unknown');
    });
    it('途中の unknown のあとの swap より後の列車は、unknown に引きずられない', () => {
        const rows = [trip(), unknown, swap, trip(), trip(true)];
        expect(basisAt(rows, 0, 'sighting')).toBe('sighting');
        expect(basisAt(rows, 1, 'sighting')).toBe('unknown');
        expect(basisAt(rows, 3, 'circulated')).toBe('sighting');
        expect(basisAt(rows, 4, 'circulated')).toBe('carried-over');
    });
});

describe('operationChain', () => {
    const trip = (operationNumber: string, carriedOver = false) =>
        ({
            kind: 'trip',
            carriedOver,
            estimated: false,
            operationId: `o-${operationNumber}`,
            operationNumber,
            trip: {},
        }) as never as FormationDayRow;
    const transfer = {
        kind: 'transfer',
        from: '16K',
        to: '15K',
        stationId: 's',
    } as FormationDayRow;

    it('その日にたどった運用を時刻順に、続く重複を除いて並べる', () => {
        expect(
            operationChain(
                [trip('16K'), trip('16K'), transfer, trip('15K'), trip('15K')],
                'sighting',
            ),
        ).toEqual([
            { operationNumber: '16K', inferred: false },
            { operationNumber: '15K', inferred: false },
        ]);
    });

    it('推測で決めた運用には inferred を付ける', () => {
        expect(
            operationChain([trip('16K'), transfer, trip('15K')], 'circulated'),
        ).toEqual([
            { operationNumber: '16K', inferred: true },
            { operationNumber: '15K', inferred: false },
        ]);
        expect(operationChain([trip('12K', true)], 'sighting')).toEqual([
            { operationNumber: '12K', inferred: true },
        ]);
    });
});
