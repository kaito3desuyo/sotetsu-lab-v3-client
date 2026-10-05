import { TripDiagramLine } from './build-trip-diagram-line.util';
import { placeThroughLabels } from './place-through-labels.util';

const EMPTY = new Set<string>();

function lineWithLabel(params: {
    tripId: string;
    minute: number;
    y: number;
    text: string;
    anchor: 'start' | 'end';
}): TripDiagramLine {
    return {
        tripId: params.tripId,
        tripNumber: params.tripId,
        tripClassColor: '#000',
        isDeadhead: false,
        segments: [],
        throughLabels: [
            {
                minute: params.minute,
                y: params.y,
                text: params.text,
                anchor: params.anchor,
            },
        ],
        stopLabels: [],
        connectors: [],
        depotMarks: [],
        minMinute: params.minute,
        maxMinute: params.minute,
    };
}

describe('placeThroughLabels', () => {
    it('同じ行（同じ y）で重なる2つのラベルは、xが小さい方だけ残す', () => {
        const lines = [
            lineWithLabel({
                tripId: 't1',
                minute: 0,
                y: 100,
                text: '渋谷',
                anchor: 'start',
            }), // x = 0*1+4 = 4, width = 2*10+8 = 28 → extent [4, 32]
            lineWithLabel({
                tripId: 't2',
                minute: 10,
                y: 100,
                text: '新宿',
                anchor: 'start',
            }), // x = 10*1+4 = 14, width = 28 → extent [14, 42]（[4,32]と重なる）
        ];

        const result = placeThroughLabels(lines, 1, EMPTY);

        expect(result.map((l) => l.tripId)).toEqual(['t1']);
        expect(result[0].text).toBe('渋谷');
    });

    it('同じ x でも y が違えば両方残す', () => {
        const lines = [
            lineWithLabel({
                tripId: 't1',
                minute: 0,
                y: 100,
                text: '渋谷',
                anchor: 'start',
            }),
            lineWithLabel({
                tripId: 't2',
                minute: 0,
                y: 200,
                text: '渋谷',
                anchor: 'start',
            }),
        ];

        const result = placeThroughLabels(lines, 1, EMPTY);

        expect(result.map((l) => l.tripId).sort()).toEqual(['t1', 't2']);
    });

    it('選んだ列車のラベルは、xが小さい（先に処理される）非選択のラベルより優先して残る', () => {
        const lines = [
            // x = 0*1+4 = 4, width = 28 → extent [4, 32]（非選択・xが小さい）
            lineWithLabel({
                tripId: 'non-selected',
                minute: 0,
                y: 100,
                text: '新宿',
                anchor: 'start',
            }),
            // x = 10*1+4 = 14, width = 28 → extent [14, 42]（選択中・[4,32]と重なる）
            lineWithLabel({
                tripId: 'selected',
                minute: 10,
                y: 100,
                text: '渋谷',
                anchor: 'start',
            }),
        ];

        const result = placeThroughLabels(lines, 1, new Set(['selected']));

        expect(result.map((l) => l.tripId)).toEqual(['selected']);
        expect(result[0].text).toBe('渋谷');
    });

    it('重ならなければ全て残す', () => {
        const lines = [
            lineWithLabel({
                tripId: 't1',
                minute: 0,
                y: 100,
                text: '渋谷',
                anchor: 'start',
            }),
            lineWithLabel({
                tripId: 't2',
                minute: 100,
                y: 100,
                text: '新宿',
                anchor: 'start',
            }),
        ];

        const result = placeThroughLabels(lines, 1, EMPTY);

        expect(result.map((l) => l.tripId)).toEqual(['t1', 't2']);
    });

    it('同じ x/y でも行き先ラベル（start・線の上）と始発駅ラベル（end・線の下）は別側なので両方残る', () => {
        const lines = [
            lineWithLabel({
                tripId: 't1',
                minute: 5,
                y: 100,
                text: '→ 渋谷',
                anchor: 'start',
            }),
            lineWithLabel({
                tripId: 't2',
                minute: 5,
                y: 100,
                text: '海老名 →',
                anchor: 'end',
            }),
        ];

        const result = placeThroughLabels(lines, 1, EMPTY);

        expect(result.map((l) => l.tripId).sort()).toEqual(['t1', 't2']);
    });

    it('同じ行で重なる2つの始発駅ラベル（anchor: end）は、xが小さい方だけ残す', () => {
        const lines = [
            lineWithLabel({
                tripId: 't1',
                minute: 0,
                y: 100,
                text: '海老名 →',
                anchor: 'end',
            }), // x = 0*1-4 = -4, width = 4*10+8 = 48 → extent [-52, -4]
            lineWithLabel({
                tripId: 't2',
                minute: 1,
                y: 100,
                text: '大和 →',
                anchor: 'end',
            }), // x = 1*1-4 = -3, width = 3*10+8 = 38 → extent [-41, -3]（[-52,-4]と重なる）
        ];

        const result = placeThroughLabels(lines, 1, EMPTY);

        expect(result.map((l) => l.tripId)).toEqual(['t1']);
    });

    it('強調中の行き先ラベル（anchor: start）は、選択列車の停車分ラベルの右へずらす', () => {
        const lines = [
            lineWithLabel({
                tripId: 't1',
                minute: 5,
                y: 100,
                text: '→ 渋谷',
                anchor: 'start',
            }),
        ];

        const result = placeThroughLabels(lines, 10, new Set(['t1']));

        // 通常なら 5*10+4=54 のところ、停車分ラベル（x+3、幅約12px）を避けて
        // 5*10 + 3 + 12 + 4 = 69 になる。
        expect(result[0].x).toBe(69);
    });

    it('何か選んでいる間、強調外のラベルは opacity 0.15、強調中は 1', () => {
        const lines = [
            lineWithLabel({
                tripId: 't1',
                minute: 0,
                y: 100,
                text: '渋谷',
                anchor: 'start',
            }),
            lineWithLabel({
                tripId: 't2',
                minute: 50,
                y: 100,
                text: '新宿',
                anchor: 'start',
            }),
        ];

        const result = placeThroughLabels(lines, 1, new Set(['t1']));

        expect(result.find((l) => l.tripId === 't1')?.opacity).toBe(1);
        expect(result.find((l) => l.tripId === 't2')?.opacity).toBe(0.15);
    });

    it("Task 19: 選択列車の最後の停車分ラベルが side:'below' なら行き先ラベルはずらさない（+4のまま）", () => {
        const lines: TripDiagramLine[] = [
            {
                ...lineWithLabel({
                    tripId: 't1',
                    minute: 5,
                    y: 100,
                    text: '→ 渋谷',
                    anchor: 'start',
                }),
                stopLabels: [{ minute: 5, y: 100, text: '10', side: 'below' }],
            },
        ];

        const result = placeThroughLabels(lines, 10, new Set(['t1']));

        // side: 'below' なので停車分ラベルとは別の基準線（重ならない）→ 通常どおり +4。
        expect(result[0].x).toBe(54);
    });

    it("Task 19: 選択列車の最後の停車分ラベルが side:'above' なら従来どおりずらす", () => {
        const lines: TripDiagramLine[] = [
            {
                ...lineWithLabel({
                    tripId: 't1',
                    minute: 5,
                    y: 100,
                    text: '→ 渋谷',
                    anchor: 'start',
                }),
                stopLabels: [{ minute: 5, y: 100, text: '10', side: 'above' }],
            },
        ];

        const result = placeThroughLabels(lines, 10, new Set(['t1']));

        expect(result[0].x).toBe(69);
    });

    it('何も選んでいなければ opacity は全て 1', () => {
        const lines = [
            lineWithLabel({
                tripId: 't1',
                minute: 0,
                y: 100,
                text: '渋谷',
                anchor: 'start',
            }),
        ];

        const result = placeThroughLabels(lines, 1, EMPTY);

        expect(result[0].opacity).toBe(1);
    });
});
