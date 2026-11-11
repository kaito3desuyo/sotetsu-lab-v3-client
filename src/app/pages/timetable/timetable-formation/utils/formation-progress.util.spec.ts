import { FormationDayRow } from './formation-day.util';
import { computeProgress } from './formation-progress.util';

const trip = (start: string, end: string, estimated = false): FormationDayRow =>
    ({
        kind: 'trip',
        trip: {
            tripOperationListId: `${start}-${end}`,
            startTime: { timeId: 's', departureDays: 1, departureTime: start },
            endTime: { timeId: 'e', arrivalDays: 1, arrivalTime: end },
        },
        operationId: 'op',
        operationNumber: '55',
        estimated,
        carriedOver: false,
    }) as FormationDayRow;

const rows: FormationDayRow[] = [
    { kind: 'depot', label: 'out', stationId: 's', time: '7:00' },
    trip('07:00:00', '08:00:00'),
    trip('09:00:00', '10:00:00'),
    trip('11:00:00', '12:00:00', true),
    trip('13:00:00', '14:00:00'),
    { kind: 'depot', label: 'in', stationId: 's', time: '14:00' },
];
const at = (h: number, m = 0): Date =>
    new Date(Date.parse(`2026-11-11T00:00:00+09:00`) + (h * 60 + m) * 60000);

describe('computeProgress', () => {
    it('走っている列車に running、過ぎた列車に past を付け、帯は隣の列車に合わせる', () => {
        const p = computeProgress(rows, '2026-11-11', 'today', at(9, 30));
        expect(p.states).toEqual([
            'past',
            'past',
            'running',
            'past',
            'future',
            'future',
        ]);
        expect(p.runningIndex).toBe(2);
        expect(p.currentIndex).toBe(2);
    });

    it('推定の列車は走っているとは見なさない', () => {
        const p = computeProgress(rows, '2026-11-11', 'today', at(11, 30));
        expect(p.runningIndex).toBe(-1);
        expect(p.states[3]).toBe('past');
        expect(p.currentIndex).toBe(4);
    });

    it('過去の日はどれも過ぎた・明日はどれもこれから', () => {
        const past = computeProgress(rows, '2026-11-01', 'past', at(9));
        expect(past.states.every((s) => s === 'past')).toBe(true);
        expect(past.currentIndex).toBe(4);
        const tomorrow = computeProgress(rows, '2026-11-12', 'tomorrow', at(9));
        expect(tomorrow.states.every((s) => s === 'future')).toBe(true);
        expect(tomorrow.runningIndex).toBe(-1);
    });

    it('今日の最後の列車が済んだら最後の列車を指す', () => {
        const p = computeProgress(rows, '2026-11-11', 'today', at(20));
        expect(p.currentIndex).toBe(4);
    });
});
