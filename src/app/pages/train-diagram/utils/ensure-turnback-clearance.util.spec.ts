import { StationAxis } from 'src/app/shared/diagram-scale';
import { TripDiagramLine } from './build-trip-diagram-line.util';
import { Turnback } from './find-turnbacks.util';
import { ensureTurnbackClearance } from './ensure-turnback-clearance.util';

function makeLine(
    tripId: string,
    segments: { minute: number; y: number }[][],
    color = '#111111',
): TripDiagramLine {
    return {
        tripId,
        tripNumber: tripId,
        tripClassColor: color,
        isDeadhead: false,
        segments,
        throughLabels: [],
        stopLabels: [],
        connectors: [],
        depotMarks: [],
        minMinute: Math.min(...segments.flat().map((p) => p.minute)),
        maxMinute: Math.max(...segments.flat().map((p) => p.minute)),
    };
}

const DEFAULT_PARAMS = {
    laneStepPx: 4,
    minClearancePx: 8,
    topPaddingPx: 12,
    bottomPaddingPx: 24,
};

describe('ensureTurnbackClearance', () => {
    it('折り返しが無ければ軸・線をそのまま返す（縮めも広げもしない）', () => {
        const axis: StationAxis = [
            { stationId: 'A', y: 0 },
            { stationId: 'B', y: 16 },
            { stationId: 'C', y: 100 },
        ];
        const lines: TripDiagramLine[] = [
            makeLine('t1', [
                [
                    { minute: 0, y: 0 },
                    { minute: 10, y: 16 },
                ],
            ]),
        ];

        const result = ensureTurnbackClearance({
            axis,
            lines,
            turnbacks: [],
            ...DEFAULT_PARAMS,
        });

        expect(result.axis).toEqual(axis);
        expect(result.lines[0].segments).toEqual(lines[0].segments);
        expect(result.links).toEqual([]);
        expect(result.widenedGaps).toEqual([]);
        expect(result.extraTopPx).toBe(0);
        expect(result.extraBottomPx).toBe(0);
    });

    it('D=12 の上張り出しで上の隙間が16 → 20 に広がる（要求仕様のケース）', () => {
        // B行（y=16）で上へ張り出す（A行との隙間 16 → 20 = D(12) + 8）。
        const axis: StationAxis = [
            { stationId: 'A', y: 0 },
            { stationId: 'B', y: 16 },
            { stationId: 'C', y: 100 },
        ];
        const arriving = makeLine('arr', [
            [
                { minute: 0, y: 100 },
                { minute: 10, y: 16 },
            ],
        ]);
        const departing = makeLine('dep', [
            [
                { minute: 15, y: 16 },
                { minute: 25, y: 100 },
            ],
        ]);
        const turnbacks: Turnback[] = [
            { arrivingTripId: 'arr', departingTripId: 'dep', stationId: 'B' },
        ];

        const result = ensureTurnbackClearance({
            axis,
            lines: [arriving, departing],
            turnbacks,
            laneStepPx: 12, // 単独の折り返しで深さ12ぴったりにする
            minClearancePx: 8,
            topPaddingPx: 12,
            bottomPaddingPx: 24,
        });

        const rows = result.axis;
        expect(rows[0].y).toBe(0);
        expect(rows[1].y - rows[0].y).toBe(20);
        // C 行との隙間は元のまま広げていない分だけ後ろにずれる。
        expect(rows[2].y - rows[1].y).toBe(100 - 16);

        expect(result.widenedGaps).toEqual([
            { rowIndex: 1, side: 'up', addedPx: 4 },
        ]);
        expect(result.extraTopPx).toBe(0);
        expect(result.extraBottomPx).toBe(0);
    });

    it('隙間が既に十分なら広げない', () => {
        const axis: StationAxis = [
            { stationId: 'A', y: 0 },
            { stationId: 'B', y: 50 }, // 十分広い
            { stationId: 'C', y: 150 },
        ];
        const arriving = makeLine('arr', [
            [
                { minute: 0, y: 150 },
                { minute: 10, y: 50 },
            ],
        ]);
        const departing = makeLine('dep', [
            [
                { minute: 15, y: 50 },
                { minute: 25, y: 150 },
            ],
        ]);
        const turnbacks: Turnback[] = [
            { arrivingTripId: 'arr', departingTripId: 'dep', stationId: 'B' },
        ];

        const result = ensureTurnbackClearance({
            axis,
            lines: [arriving, departing],
            turnbacks,
            laneStepPx: 12,
            minClearancePx: 8,
            topPaddingPx: 12,
            bottomPaddingPx: 24,
        });

        expect(result.axis).toEqual(axis);
        expect(result.widenedGaps).toEqual([]);
    });

    it('先頭行が上へ張り出す（隣が無い）→ bodyHeight 側で使う extraTopPx が不足分だけ増える', () => {
        const axis: StationAxis = [
            { stationId: 'A', y: 0 },
            { stationId: 'B', y: 100 },
        ];
        // A行（先頭行, index 0）で上へ張り出す。
        const arriving = makeLine('arr', [
            [
                { minute: 0, y: 100 },
                { minute: 10, y: 0 },
            ],
        ]);
        const departing = makeLine('dep', [
            [
                { minute: 15, y: 0 },
                { minute: 25, y: 100 },
            ],
        ]);
        const turnbacks: Turnback[] = [
            { arrivingTripId: 'arr', departingTripId: 'dep', stationId: 'A' },
        ];

        const result = ensureTurnbackClearance({
            axis,
            lines: [arriving, departing],
            turnbacks,
            laneStepPx: 12,
            minClearancePx: 8,
            topPaddingPx: 12, // 既存の余白(12) < 必要(12+8=20) → 不足8
            bottomPaddingPx: 24,
        });

        expect(result.extraTopPx).toBe(8);
        expect(result.extraBottomPx).toBe(0);
        // 軸全体が不足分だけ下にずれる。
        expect(result.axis[0].y).toBe(8);
        expect(result.axis[1].y).toBe(108);
    });

    it('末尾行が下へ張り出す（隣が無い）→ bodyHeight を広げるための extraBottomPx が増える', () => {
        const axis: StationAxis = [
            { stationId: 'A', y: 0 },
            { stationId: 'B', y: 100 },
        ];
        // B行（末尾行）で下へ張り出す。
        const arriving = makeLine('arr', [
            [
                { minute: 0, y: 0 },
                { minute: 10, y: 100 },
            ],
        ]);
        const departing = makeLine('dep', [
            [
                { minute: 15, y: 100 },
                { minute: 25, y: 0 },
            ],
        ]);
        const turnbacks: Turnback[] = [
            { arrivingTripId: 'arr', departingTripId: 'dep', stationId: 'B' },
        ];

        const result = ensureTurnbackClearance({
            axis,
            lines: [arriving, departing],
            turnbacks,
            laneStepPx: 12,
            minClearancePx: 8,
            topPaddingPx: 12,
            bottomPaddingPx: 8, // 既存の余白(8) < 必要(12+8=20) → 不足12
        });

        expect(result.extraBottomPx).toBe(12);
        expect(result.extraTopPx).toBe(0);
        // 末尾行の張り出しは本体余白側で吸収するため、軸自体はずらさない。
        expect(result.axis).toEqual(axis);
    });

    it('線の y は移し替え後もちょうど新しい行の y に乗る（segments・connectors・stopLabels・throughLabels・depotMarks）', () => {
        const axis: StationAxis = [
            { stationId: 'A', y: 0 },
            { stationId: 'B', y: 16 },
            { stationId: 'C', y: 100 },
        ];
        const line: TripDiagramLine = {
            tripId: 'full',
            tripNumber: 'F',
            tripClassColor: '#222',
            isDeadhead: false,
            segments: [
                [
                    { minute: 0, y: 0 },
                    { minute: 5, y: 16 },
                ],
                [
                    { minute: 20, y: 16 },
                    { minute: 30, y: 100 },
                ],
            ],
            throughLabels: [{ minute: 0, y: 0, text: '始発 →', anchor: 'end' }],
            stopLabels: [{ minute: 5, y: 16, text: '05', side: 'above' }],
            connectors: [{ minute: 10, fromY: 16, toY: 100 }],
            depotMarks: [{ kind: 'out', minute: 0, y: 0 }],
            minMinute: 0,
            maxMinute: 30,
        };
        const arriving = makeLine('arr', [
            [
                { minute: 0, y: 100 },
                { minute: 10, y: 16 },
            ],
        ]);
        const departing = makeLine('dep', [
            [
                { minute: 15, y: 16 },
                { minute: 25, y: 100 },
            ],
        ]);
        const turnbacks: Turnback[] = [
            { arrivingTripId: 'arr', departingTripId: 'dep', stationId: 'B' },
        ];

        const result = ensureTurnbackClearance({
            axis,
            lines: [line, arriving, departing],
            turnbacks,
            laneStepPx: 12,
            minClearancePx: 8,
            topPaddingPx: 12,
            bottomPaddingPx: 24,
        });

        const newAxisYByStationId = new Map(
            result.axis.map((entry) => [entry.stationId, entry.y]),
        );
        const yA = newAxisYByStationId.get('A') as number;
        const yB = newAxisYByStationId.get('B') as number;
        const yC = newAxisYByStationId.get('C') as number;

        const remapped = result.lines.find(
            (l) => l.tripId === 'full',
        ) as TripDiagramLine;
        expect(remapped.segments[0]).toEqual([
            { minute: 0, y: yA },
            { minute: 5, y: yB },
        ]);
        expect(remapped.segments[1]).toEqual([
            { minute: 20, y: yB },
            { minute: 30, y: yC },
        ]);
        expect(remapped.throughLabels[0].y).toBe(yA);
        expect(remapped.stopLabels[0].y).toBe(yB);
        expect(remapped.connectors[0]).toEqual({
            minute: 10,
            fromY: yB,
            toY: yC,
        });
        expect(remapped.depotMarks[0].y).toBe(yA);
    });

    it('広げた後、引き直したリンクの張り出しが隙間内（8px 以上の余白）に収まる', () => {
        const axis: StationAxis = [
            { stationId: 'A', y: 0 },
            { stationId: 'B', y: 16 },
            { stationId: 'C', y: 100 },
        ];
        const arriving = makeLine('arr', [
            [
                { minute: 0, y: 100 },
                { minute: 10, y: 16 },
            ],
        ]);
        const departing = makeLine('dep', [
            [
                { minute: 15, y: 16 },
                { minute: 25, y: 100 },
            ],
        ]);
        const turnbacks: Turnback[] = [
            { arrivingTripId: 'arr', departingTripId: 'dep', stationId: 'B' },
        ];

        const result = ensureTurnbackClearance({
            axis,
            lines: [arriving, departing],
            turnbacks,
            laneStepPx: 12,
            minClearancePx: 8,
            topPaddingPx: 12,
            bottomPaddingPx: 24,
        });

        expect(result.links.length).toBe(1);
        const link = result.links[0];
        const upperNeighborY = result.axis[0].y; // A行
        const rowY = result.axis[1].y; // B行（着の行）
        const bulgeY = link.points[1].y;
        expect(bulgeY).toBeLessThan(rowY); // 上へ張り出す
        expect(rowY - bulgeY).toBe(12); // 深さは変わらない
        expect(bulgeY - upperNeighborY).toBeGreaterThanOrEqual(8); // 8px 以上の余白を保つ
    });

    it('軸が空なら空の結果を返す', () => {
        const result = ensureTurnbackClearance({
            axis: [],
            lines: [],
            turnbacks: [],
            ...DEFAULT_PARAMS,
        });
        expect(result.axis).toEqual([]);
        expect(result.lines).toEqual([]);
        expect(result.links).toEqual([]);
        expect(result.extraTopPx).toBe(0);
        expect(result.extraBottomPx).toBe(0);
    });
});
