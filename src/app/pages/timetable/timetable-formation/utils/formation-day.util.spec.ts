import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import {
    basisAt,
    buildFormationDay,
    FormationDayInput,
    FormationDayRow,
    missingOperationIds,
} from './formation-day.util';

const BASE_DATE = '2026-11-11';

/** 'HH:mm' -> TimeDetailsDto 用（24 時超えは days 1） */
function t(hm: string) {
    const [h, m] = hm.split(':').map(Number);
    return {
        timeId: `t-${hm}`,
        departureDays: h >= 24 ? 1 : 0,
        departureTime: `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
        arrivalDays: h >= 24 ? 1 : 0,
        arrivalTime: `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
    };
}

function tol(
    id: string,
    operationId: string,
    start: string,
    end: string,
    trip: { depotIn?: boolean; depotOut?: boolean } = {},
): TripOperationListDetailsDto {
    return {
        tripOperationListId: id,
        tripId: `trip-${id}`,
        operationId,
        startStationId: `s-${id}-start`,
        endStationId: `s-${id}-end`,
        startTime: t(start),
        endTime: t(end),
        trip: { tripId: `trip-${id}`, ...trip },
    };
}

function op(
    operationId: string,
    operationNumber: string,
    trips: TripOperationListDetailsDto[],
): OperationTripsDto {
    return { operation: { operationId, operationNumber }, trips };
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
    };
}

/** 前=prevTol の運用の最後の列車、次=nextTol（別の運用の最初の列車）の乗り移り */
function link(
    from: TripOperationListDetailsDto,
    to: TripOperationListDetailsDto,
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

    it('乗り移りで 16K から 15K に続け、transfer の帯を入れる', () => {
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
                        },
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

    it('乗り移りで同じ運用に戻っても止まる', () => {
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

    it('無効にされた目撃は使わない', () => {
        const rows = buildFormationDay(
            input({
                firstOperationId: 'op16',
                sightings: [
                    sighting('s1', 'f1', 'op15', '11:30', {
                        invalidation: {
                            operationSightingInvalidationId: 'inv',
                            operationSightingId: 's1',
                        },
                    }),
                    sighting('s2', 'f2', 'op16', '12:00', {
                        invalidation: {
                            operationSightingInvalidationId: 'inv2',
                            operationSightingId: 's2',
                        },
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
            time: '5:00',
        });
        expect(rows[7]).toEqual({
            kind: 'depot',
            label: 'in',
            stationId: 's-e4-end',
            time: '24:50',
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

    it('最初の目撃がその運用の最後の列車より後でも、昼の乗り移りより前は前の運用', () => {
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

    it('missingOperationIds は乗り移り先で trips の無い運用を返す', () => {
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
    it('直前の決め手が乗り移りなら transfer', () => {
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
    it('直前の決め手が swap なら sighting（乗り移りより後の swap が勝つ）', () => {
        expect(basisAt([trip(), transfer, swap, trip()], 3, 'circulated')).toBe(
            'sighting',
        );
    });
    it('unknown の行以降は unknown', () => {
        expect(basisAt([trip(), unknown], 1, 'sighting')).toBe('unknown');
    });
});
