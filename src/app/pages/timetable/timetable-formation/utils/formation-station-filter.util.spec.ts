import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { FormationDayRow } from './formation-day.util';
import { filterByStation } from './formation-station-filter.util';

const BASE = '2026-11-11';
const at = (hms: string): Date => new Date(`${BASE}T${hms}+09:00`);

function stopTime(stationId: string, seq: number, hms: string): TimeDetailsDto {
    return {
        timeId: `${stationId}-${seq}`,
        stationId,
        stopSequence: seq,
        pickupType: 0,
        dropoffType: 0,
        arrivalDays: 1,
        arrivalTime: hms,
        departureDays: 1,
        departureTime: hms,
    };
}

function passTime(stationId: string, seq: number): TimeDetailsDto {
    return {
        timeId: `${stationId}-${seq}`,
        stationId,
        stopSequence: seq,
        pickupType: 1,
        dropoffType: 1,
        arrivalTime: null,
        departureTime: null,
    };
}

function row(id: string, times: TimeDetailsDto[]): FormationDayRow {
    return {
        kind: 'trip',
        trip: {
            tripOperationListId: id,
            trip: { times },
        } as unknown as TripOperationListDetailsDto,
        operationId: 'op',
        operationNumber: '1',
        estimated: false,
        carriedOver: false,
    };
}

/** 横浜 → 二俣川 → 海老名。二俣川は hms に停車 */
function stopAtFutamata(id: string, hms: string): FormationDayRow {
    return row(id, [
        stopTime('yokohama', 1, '05:00:00'),
        stopTime('futamata', 2, hms),
        stopTime('ebina', 3, '23:00:00'),
    ]);
}

describe('filterByStation', () => {
    it('pickupType が無くても時刻が両方 null なら通過', () => {
        const pass = passTime('futamata', 2);
        delete pass.pickupType;
        delete pass.dropoffType;
        const r = filterByStation(
            [
                row('p', [
                    stopTime('yokohama', 1, '10:00:00'),
                    pass,
                    stopTime('ebina', 3, '11:00:00'),
                ]),
            ],
            'futamata',
            BASE,
            at('12:00:00'),
        );
        expect(r.passes).toBe(1);
        expect(r.stops).toBe(0);
        expect(r.done).toBe(1);
    });

    it('モックの二俣川: 16 回（停車 14・通過 2）', () => {
        const rows: FormationDayRow[] = [];
        for (let i = 0; i < 14; i++) {
            rows.push(
                stopAtFutamata(
                    `s${i}`,
                    `${String(6 + i).padStart(2, '0')}:00:00`,
                ),
            );
        }
        for (let i = 0; i < 2; i++) {
            rows.push(
                row(`p${i}`, [
                    stopTime('yokohama', 1, '20:00:00'),
                    passTime('futamata', 2),
                    stopTime('ebina', 3, '21:00:00'),
                ]),
            );
        }
        const r = filterByStation(rows, 'futamata', BASE, at('12:00:00'));
        expect(r.total).toBe(16);
        expect(r.stops).toBe(14);
        expect(r.passes).toBe(2);
        expect(r.visits).toHaveLength(16);
        expect(r.done + r.remaining).toBe(16);
    });

    it('通過の済み・残りは前後の停車駅で決める', () => {
        const mk = (): FormationDayRow =>
            row('p', [
                stopTime('a', 1, '10:00:00'),
                passTime('x', 2),
                stopTime('b', 3, '10:10:00'),
            ]);
        // 前の停車駅は now より前、次は後 → まだ
        expect(filterByStation([mk()], 'x', BASE, at('10:05:00')).done).toBe(0);
        // 次の停車駅も過ぎた → 済み
        expect(filterByStation([mk()], 'x', BASE, at('10:20:00')).done).toBe(1);
        // 前の停車駅も未到達 → まだ
        expect(
            filterByStation([mk()], 'x', BASE, at('09:00:00')).remaining,
        ).toBe(1);
    });

    it('始発の次の駅を通過する列車も決まる', () => {
        const r = row('p', [
            {
                ...stopTime('origin', 1, '10:00:00'),
                arrivalTime: null,
                arrivalDays: null,
            },
            passTime('x', 2),
            stopTime('b', 3, '10:10:00'),
        ]);
        expect(filterByStation([r], 'x', BASE, at('10:20:00')).done).toBe(1);
        expect(filterByStation([r], 'x', BASE, at('10:05:00')).done).toBe(0);
    });

    it('24 時超えの時刻も営業日の軸で比べる', () => {
        const r = row('p', [
            {
                ...stopTime('x', 1, '00:30:00'),
                arrivalDays: 2,
                departureDays: 2,
            },
        ]);
        expect(filterByStation([r], 'x', BASE, at('23:00:00')).done).toBe(0);
        expect(
            filterByStation(
                [r],
                'x',
                BASE,
                new Date('2026-11-12T01:00:00+09:00'),
            ).done,
        ).toBe(1);
    });

    it('now が null なら全部 done', () => {
        const r = filterByStation(
            [stopAtFutamata('a', '08:00:00'), stopAtFutamata('b', '23:50:00')],
            'futamata',
            BASE,
            null,
        );
        expect(r.done).toBe(2);
        expect(r.remaining).toBe(0);
    });

    it('unknown の行より後の列車は数えない', () => {
        const rows: FormationDayRow[] = [
            stopAtFutamata('a', '08:00:00'),
            {
                kind: 'unknown',
                lastOperationNumber: '1',
                evictedBy: { formationNumber: '9000', sightingTime: '' },
            },
            stopAtFutamata('b', '09:00:00'),
        ];
        expect(filterByStation(rows, 'futamata', BASE, null).total).toBe(1);
    });

    it('その駅に来ない列車は数えない', () => {
        const r = filterByStation(
            [stopAtFutamata('a', '08:00:00')],
            'nowhere',
            BASE,
            null,
        );
        expect(r.total).toBe(0);
    });
});
