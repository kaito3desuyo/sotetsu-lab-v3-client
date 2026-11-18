import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { OperationDayRow } from './operation-day.util';
import { computeOperationProgress } from './operation-progress.util';

function tripRow(start: string, end: string): OperationDayRow {
    const t = (hm: string) => {
        const [h, m] = hm.split(':').map(Number);
        const time = `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
        const days = h >= 24 ? 2 : 1;
        return {
            departureDays: days,
            departureTime: time,
            arrivalDays: days,
            arrivalTime: time,
        };
    };
    return {
        kind: 'trip',
        trip: {
            tripOperationListId: start,
            startTime: t(start),
            endTime: t(end),
        } as TripOperationListDetailsDto,
        formationNumber: null,
        inferred: false,
        sightingTimes: [],
    };
}

const depotIn: OperationDayRow = {
    kind: 'depot',
    label: 'in',
    stationId: 's',
    time: '25:04',
};

describe('computeOperationProgress', () => {
    const rows = [
        tripRow('23:00', '23:30'),
        tripRow('24:47', '25:04'),
        depotIn,
    ];

    it('0 時〜4 時は前の営業日の 24 時台の列車を走っている扱いにする', () => {
        const p = computeOperationProgress(
            rows,
            '2026-11-16',
            'today',
            new Date('2026-11-17T00:50:00+09:00'),
        );
        expect(p.states).toEqual(['past', 'running', 'running']);
        expect(p.runningIndex).toBe(1);
    });

    it('過去の日はどれも past', () => {
        const p = computeOperationProgress(
            rows,
            '2026-11-10',
            'past',
            new Date('2026-11-17T00:50:00+09:00'),
        );
        expect(p.states).toEqual(['past', 'past', 'past']);
        expect(p.runningIndex).toBe(-1);
    });

    it('ダイヤの形はどれも future（薄くしない）', () => {
        const p = computeOperationProgress(
            rows,
            null,
            'calendar',
            new Date('2026-11-17T00:50:00+09:00'),
        );
        expect(p.states).toEqual(['future', 'future', 'future']);
    });

    it('今日の始発前はどれも future', () => {
        const p = computeOperationProgress(
            rows,
            '2026-11-16',
            'today',
            new Date('2026-11-16T12:00:00+09:00'),
        );
        expect(p.states).toEqual(['future', 'future', 'future']);
    });
});
