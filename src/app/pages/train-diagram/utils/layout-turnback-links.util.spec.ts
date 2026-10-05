import { StationAxis } from 'src/app/shared/diagram-scale';
import { TripDiagramLine } from './build-trip-diagram-line.util';
import { Turnback } from './find-turnbacks.util';
import { layoutTurnbackLinks } from './layout-turnback-links.util';

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

describe('layoutTurnbackLinks', () => {
    it('分岐しない駅（軸に1回だけ）: 上から来て折り返す（前の点の y < 着の点の y）→ 張り出しは下（y が着の y より大きい）', () => {
        const arriving = makeLine('arr', [
            [
                { minute: 0, y: 10 },
                { minute: 10, y: 50 },
            ],
        ]);
        const departing = makeLine('dep', [
            [
                { minute: 15, y: 50 },
                { minute: 25, y: 90 },
            ],
        ]);
        const turnback: Turnback = {
            arrivingTripId: 'arr',
            departingTripId: 'dep',
            stationId: 'Y',
        };
        const linesByTripId = new Map([
            ['arr', arriving],
            ['dep', departing],
        ]);
        const axis: StationAxis = [{ stationId: 'Y', y: 50 }];

        const [link] = layoutTurnbackLinks({
            turnbacks: [turnback],
            linesByTripId,
            laneStepPx: 4,
            axis,
        });

        expect(link).toBeDefined();
        expect(link.points[0]).toEqual({ minute: 10, y: 50 });
        expect(link.points[1].y).toBeGreaterThan(50);
        expect(link.points[2].y).toBe(link.points[1].y);
        expect(link.points[3]).toEqual({ minute: 15, y: 50 });
        expect(link.color).toBe('#111111');
        expect(link.minMinute).toBe(10);
        expect(link.maxMinute).toBe(15);
        // 分岐しない駅は着の y = 発の y なので connector は無い。
        expect(link.connectors).toEqual([]);
    });

    it('着く線の最後が停車の横線でも、高さの違う手前の点で側を決める（下から上がってきたら上へ張り出す）', () => {
        const arriving = makeLine('arr', [
            [
                { minute: 0, y: 90 },
                { minute: 10, y: 50 },
                { minute: 12, y: 50 },
            ],
        ]);
        const departing = makeLine('dep', [
            [
                { minute: 15, y: 50 },
                { minute: 25, y: 90 },
            ],
        ]);
        const [link] = layoutTurnbackLinks({
            turnbacks: [
                {
                    arrivingTripId: 'arr',
                    departingTripId: 'dep',
                    stationId: 'Y',
                },
            ],
            linesByTripId: new Map([
                ['arr', arriving],
                ['dep', departing],
            ]),
            laneStepPx: 4,
            axis: [{ stationId: 'Y', y: 50 }],
        });

        expect(link.points[1].y).toBeLessThan(50);
    });

    it('着く線が折り返し駅の行まで届いていなければ、折り返し線を作らない', () => {
        const arriving = makeLine('arr', [
            [
                { minute: 0, y: 10 },
                { minute: 2, y: 10 },
            ],
        ]);
        const departing = makeLine('dep', [
            [
                { minute: 15, y: 50 },
                { minute: 25, y: 90 },
            ],
        ]);
        const links = layoutTurnbackLinks({
            turnbacks: [
                {
                    arrivingTripId: 'arr',
                    departingTripId: 'dep',
                    stationId: 'Y',
                },
            ],
            linesByTripId: new Map([
                ['arr', arriving],
                ['dep', departing],
            ]),
            laneStepPx: 4,
            axis: [
                { stationId: 'X', y: 10 },
                { stationId: 'Y', y: 50 },
            ],
        });

        expect(links).toEqual([]);
    });

    it('Task 18: 分岐駅（西谷型）で着が分岐元の行（本線側）・発が複製行（支線側）→ ⊐字は分岐元の行に乗り、発の分にだけ点線を持つ', () => {
        // 西谷を想定: 分岐元の行（本線・上星川↔鶴ヶ峰側）は y=110。
        // 複製行（新横浜線側）は y=265。着く列車は分岐元の行で終わり、
        // 発つ列車は複製行から始まる。
        const arriving = makeLine('arr', [
            [
                { minute: 0, y: 70 },
                { minute: 10, y: 110 },
            ],
        ]);
        const departing = makeLine('dep', [
            [
                { minute: 15, y: 265 },
                { minute: 25, y: 300 },
            ],
        ]);
        const linesByTripId = new Map([
            ['arr', arriving],
            ['dep', departing],
        ]);
        const axis: StationAxis = [
            { stationId: 'Y', y: 265, isDuplicate: true },
            { stationId: 'Y', y: 110 },
        ];

        const [link] = layoutTurnbackLinks({
            turnbacks: [
                {
                    arrivingTripId: 'arr',
                    departingTripId: 'dep',
                    stationId: 'Y',
                },
            ],
            linesByTripId,
            laneStepPx: 4,
            axis,
        });

        // ⊐字の4点はすべて分岐元の行（y=110）。
        expect(link.points[0]).toEqual({ minute: 10, y: 110 });
        expect(link.points[1].y).toBeCloseTo(110 + 4, 5); // 深さは laneStepPx(4) × 1段
        expect(link.points[2].y).toBe(link.points[1].y);
        expect(link.points[3]).toEqual({ minute: 15, y: 110 });

        // 発の分（15）に、分岐元の行(110)↔発の点(265)をつなぐ点線を持つ。着の分には無い。
        expect(link.connectors).toEqual([{ minute: 15, fromY: 110, toY: 265 }]);
    });

    it('Task 18: 二俣川型で着が複製行（海老名方面）・発が分岐元の行（湘南台方面）→ ⊐字は分岐元の行に乗り、着の分にだけ点線を持つ', () => {
        // 分岐元の行（本線・鶴ヶ峰↔南万騎が原側）は y=110。複製行（いずみ野線側）は y=265。
        const arriving = makeLine('arr', [
            [
                { minute: 0, y: 200 },
                { minute: 10, y: 265 },
            ],
        ]);
        // 発の次の点の y(150) > 発の点の y(110) → 下へ進む → 張り出しは上。
        const departing = makeLine('dep', [
            [
                { minute: 15, y: 110 },
                { minute: 25, y: 150 },
            ],
        ]);
        const linesByTripId = new Map([
            ['arr', arriving],
            ['dep', departing],
        ]);
        const axis: StationAxis = [
            { stationId: 'Y', y: 265, isDuplicate: true },
            { stationId: 'Y', y: 110 },
        ];

        const [link] = layoutTurnbackLinks({
            turnbacks: [
                {
                    arrivingTripId: 'arr',
                    departingTripId: 'dep',
                    stationId: 'Y',
                },
            ],
            linesByTripId,
            laneStepPx: 4,
            axis,
        });

        expect(link.points[0]).toEqual({ minute: 10, y: 110 });
        expect(link.points[1].y).toBeCloseTo(110 - 4, 5); // 発が下へ進む→張り出しは上
        expect(link.points[2].y).toBe(link.points[1].y);
        expect(link.points[3]).toEqual({ minute: 15, y: 110 });

        // 着の分（10）に、着の点(265)↔分岐元の行(110)をつなぐ点線を持つ。発の分には無い。
        expect(link.connectors).toEqual([{ minute: 10, fromY: 265, toY: 110 }]);
    });

    it('Task 18: 着・発の両方が複製行 → ⊐字は分岐元の行に乗り、両分に点線を持つ', () => {
        const arriving = makeLine('arr', [
            [
                { minute: 0, y: 200 },
                { minute: 10, y: 265 },
            ],
        ]);
        const departing = makeLine('dep', [
            [
                { minute: 15, y: 265 },
                { minute: 25, y: 300 },
            ],
        ]);
        const linesByTripId = new Map([
            ['arr', arriving],
            ['dep', departing],
        ]);
        const axis: StationAxis = [
            { stationId: 'Y', y: 265, isDuplicate: true },
            { stationId: 'Y', y: 110 },
        ];

        const [link] = layoutTurnbackLinks({
            turnbacks: [
                {
                    arrivingTripId: 'arr',
                    departingTripId: 'dep',
                    stationId: 'Y',
                },
            ],
            linesByTripId,
            laneStepPx: 4,
            axis,
        });

        // 着の行(265)は分岐元(110)より下 → 張り出しは上。
        expect(link.points[0]).toEqual({ minute: 10, y: 110 });
        expect(link.points[1].y).toBeCloseTo(110 - 4, 5);
        expect(link.points[2].y).toBe(link.points[1].y);
        expect(link.points[3]).toEqual({ minute: 15, y: 110 });

        expect(link.connectors).toEqual([
            { minute: 10, fromY: 265, toY: 110 },
            { minute: 15, fromY: 110, toY: 265 },
        ]);
    });

    it('分岐しない駅（軸に1回だけ）: 下から来て折り返す（前の点の y > 着の点の y）→ 張り出しは上（y が着の y より小さい）', () => {
        const arriving = makeLine('arr', [
            [
                { minute: 0, y: 90 },
                { minute: 10, y: 50 },
            ],
        ]);
        const departing = makeLine('dep', [
            [
                { minute: 15, y: 50 },
                { minute: 25, y: 10 },
            ],
        ]);
        const linesByTripId = new Map([
            ['arr', arriving],
            ['dep', departing],
        ]);
        const axis: StationAxis = [{ stationId: 'Y', y: 50 }];

        const [link] = layoutTurnbackLinks({
            turnbacks: [
                {
                    arrivingTripId: 'arr',
                    departingTripId: 'dep',
                    stationId: 'Y',
                },
            ],
            linesByTripId,
            laneStepPx: 4,
            axis,
        });

        expect(link.points[1].y).toBeLessThan(50);
    });

    it('同じ駅・同じ側で時間が重なる2件 → 深さ4と8', () => {
        // 両方とも Y駅(y=50)で下へ張り出す折り返し。時間区間が重なる。
        const arriving1 = makeLine('arr1', [
            [
                { minute: 0, y: 10 },
                { minute: 10, y: 50 },
            ],
        ]);
        const departing1 = makeLine('dep1', [
            [
                { minute: 20, y: 50 },
                { minute: 30, y: 90 },
            ],
        ]);
        const arriving2 = makeLine('arr2', [
            [
                { minute: 0, y: 10 },
                { minute: 15, y: 50 },
            ],
        ]);
        const departing2 = makeLine('dep2', [
            [
                { minute: 25, y: 50 },
                { minute: 35, y: 90 },
            ],
        ]);
        const linesByTripId = new Map([
            ['arr1', arriving1],
            ['dep1', departing1],
            ['arr2', arriving2],
            ['dep2', departing2],
        ]);
        const axis: StationAxis = [{ stationId: 'Y', y: 50 }];

        const links = layoutTurnbackLinks({
            turnbacks: [
                {
                    arrivingTripId: 'arr1',
                    departingTripId: 'dep1',
                    stationId: 'Y',
                },
                {
                    arrivingTripId: 'arr2',
                    departingTripId: 'dep2',
                    stationId: 'Y',
                },
            ],
            linesByTripId,
            laneStepPx: 4,
            axis,
        });

        const link1 = links.find((l) => l.arrivingTripId === 'arr1');
        const link2 = links.find((l) => l.arrivingTripId === 'arr2');
        expect(link1?.points[1].y).toBe(50 + 4);
        expect(link2?.points[1].y).toBe(50 + 8);
    });

    it('同じ駅・同じ側で時間が重ならない2件 → 両方とも深さ4', () => {
        const arriving1 = makeLine('arr1', [
            [
                { minute: 0, y: 10 },
                { minute: 10, y: 50 },
            ],
        ]);
        const departing1 = makeLine('dep1', [
            [
                { minute: 15, y: 50 },
                { minute: 20, y: 90 },
            ],
        ]);
        const arriving2 = makeLine('arr2', [
            [
                { minute: 30, y: 10 },
                { minute: 40, y: 50 },
            ],
        ]);
        const departing2 = makeLine('dep2', [
            [
                { minute: 45, y: 50 },
                { minute: 50, y: 90 },
            ],
        ]);
        const linesByTripId = new Map([
            ['arr1', arriving1],
            ['dep1', departing1],
            ['arr2', arriving2],
            ['dep2', departing2],
        ]);
        const axis: StationAxis = [{ stationId: 'Y', y: 50 }];

        const links = layoutTurnbackLinks({
            turnbacks: [
                {
                    arrivingTripId: 'arr1',
                    departingTripId: 'dep1',
                    stationId: 'Y',
                },
                {
                    arrivingTripId: 'arr2',
                    departingTripId: 'dep2',
                    stationId: 'Y',
                },
            ],
            linesByTripId,
            laneStepPx: 4,
            axis,
        });

        for (const link of links) {
            expect(link.points[1].y).toBe(50 + 4);
        }
    });

    it('片方の線が無い（図に描かれていない）→ 作らない', () => {
        const arriving = makeLine('arr', [
            [
                { minute: 0, y: 10 },
                { minute: 10, y: 50 },
            ],
        ]);
        const linesByTripId = new Map([['arr', arriving]]);
        const axis: StationAxis = [{ stationId: 'Y', y: 50 }];

        const links = layoutTurnbackLinks({
            turnbacks: [
                {
                    arrivingTripId: 'arr',
                    departingTripId: 'missing',
                    stationId: 'Y',
                },
            ],
            linesByTripId,
            laneStepPx: 4,
            axis,
        });

        expect(links).toEqual([]);
    });
});
