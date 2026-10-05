import { TripDiagramLine } from './build-trip-diagram-line.util';
import { selectVisibleLines } from './select-visible-lines.util';

function line(
    tripId: string,
    minMinute: number,
    maxMinute: number,
): TripDiagramLine {
    return {
        tripId,
        tripNumber: tripId,
        tripClassColor: '#000',
        isDeadhead: false,
        segments: [],
        throughLabels: [],
        stopLabels: [],
        connectors: [],
        depotMarks: [],
        minMinute,
        maxMinute,
    };
}

const EMPTY = new Set<string>();

describe('selectVisibleLines', () => {
    const lines = [
        line('early', 0, 50),
        line('near', 60, 95),
        line('inside', 120, 150),
        line('late', 400, 450),
    ];

    it('見えている範囲の前後 30 分にかかる線だけ残す', () => {
        const result = selectVisibleLines(
            lines,
            { startMinute: 125, endMinute: 200 },
            EMPTY,
        );
        expect(result.map((l) => l.tripId)).toEqual(['near', 'inside']);
    });

    it('強調中の線は範囲外でも残し、最後（最前面）に置く', () => {
        const result = selectVisibleLines(
            lines,
            { startMinute: 125, endMinute: 200 },
            new Set(['early']),
        );
        expect(result.map((l) => l.tripId)).toEqual([
            'near',
            'inside',
            'early',
        ]);
    });

    it('強調中の線が範囲内なら並びの最後へ移す', () => {
        const result = selectVisibleLines(
            lines,
            { startMinute: 125, endMinute: 200 },
            new Set(['near']),
        );
        expect(result.map((l) => l.tripId)).toEqual(['inside', 'near']);
    });

    it('強調中の線が複数あれば全て最後へ、範囲内の線同士の並びは保つ', () => {
        const result = selectVisibleLines(
            lines,
            { startMinute: 125, endMinute: 200 },
            new Set(['early', 'late']),
        );
        expect(result.map((l) => l.tripId)).toEqual([
            'near',
            'inside',
            'early',
            'late',
        ]);
    });
});
