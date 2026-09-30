import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { StationAxis } from 'src/app/shared/diagram-scale';
import {
    buildChainDiagramLines,
    buildChainStopIndexObservations,
} from './build-chain-diagram-lines.util';

/** テスト用: `stationId -> y` の Map から StationAxis（順序付き配列）を組み立てる。 */
function toAxis(entries: readonly (readonly [string, number])[]): StationAxis {
    return entries.map(([stationId, y]) => ({ stationId, y }));
}

const base = new Date(2026, 6, 20, 0, 0, 0, 0);

function time(params: {
    stationId: string;
    stopSequence: number;
    arrivalTime?: string;
    departureTime?: string;
}): TimeDetailsDto {
    return {
        timeId: `${params.stationId}-${params.stopSequence}`,
        stationId: params.stationId,
        stopSequence: params.stopSequence,
        arrivalTime: params.arrivalTime,
        departureTime: params.departureTime,
        arrivalDays: 1,
        departureDays: 1,
    } as TimeDetailsDto;
}

function trip(params: {
    tripId: string;
    tripNumber: string;
    times: TimeDetailsDto[];
    depotIn?: boolean;
    depotOut?: boolean;
}): TripDetailsDto {
    return {
        tripId: params.tripId,
        tripNumber: params.tripNumber,
        tripClassId: 'tc1',
        tripClass: { tripClassColor: '#8a8a8a' } as any,
        times: params.times,
        depotIn: params.depotIn,
        depotOut: params.depotOut,
    } as TripDetailsDto;
}

// 小さな軸: A(0) B(10) C(20) D(30)
const smallAxis = toAxis([
    ['A', 0],
    ['B', 10],
    ['C', 20],
    ['D', 30],
]);
const smallAxisStationIds = new Set(['A', 'B', 'C', 'D']);

describe('buildChainDiagramLines', () => {
    it('trips が空なら空配列を返す', () => {
        expect(
            buildChainDiagramLines({
                trips: [],
                axis: smallAxis,
                axisStationIds: smallAxisStationIds,
                base,
                stationNameById: new Map(),
            }),
        ).toEqual([]);
    });

    it('種別変更のつながり: P(A→B) と Q(B→C) をつなげ、Bの停車の横線はQの色（Qの線）に入る', () => {
        const p = trip({
            tripId: 'trip-p',
            tripNumber: 'P',
            times: [
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'B',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'trip-q',
            tripNumber: 'Q',
            times: [
                time({
                    stationId: 'B',
                    stopSequence: 1,
                    departureTime: '07:12:00',
                }),
                time({
                    stationId: 'C',
                    stopSequence: 2,
                    arrivalTime: '07:20:00',
                }),
            ],
        });

        const lines = buildChainDiagramLines({
            trips: [p, q],
            axis: smallAxis,
            axisStationIds: smallAxisStationIds,
            base,
            stationNameById: new Map(),
        });

        expect(lines).toHaveLength(2);
        const pLine = lines.find((l) => l.tripId === 'trip-p');
        const qLine = lines.find((l) => l.tripId === 'trip-q');

        // P の線の点: [A 7:00, B 7:10]
        expect(pLine?.segments).toEqual([
            [
                { minute: 180, y: 0 },
                { minute: 190, y: 10 },
            ],
        ]);
        // Q の線の点: [B 7:10, B 7:12, C 7:20]（B の停車の横線は Q の色）
        expect(qLine?.segments).toEqual([
            [
                { minute: 190, y: 10 },
                { minute: 192, y: 10 },
                { minute: 200, y: 20 },
            ],
        ]);

        // 停車の分の字は A「00」・B「12」・C「20」の 3 つだけ（B は 1 つ）
        expect(pLine?.stopLabels).toEqual([
            { minute: 180, y: 0, text: '00', side: 'above' },
        ]);
        expect(qLine?.stopLabels).toEqual([
            { minute: 192, y: 10, text: '12', side: 'above' },
            { minute: 200, y: 20, text: '20', side: 'above' },
        ]);

        expect(pLine?.isChainHead).toBe(true);
        expect(qLine?.isChainHead).toBe(false);
    });

    it('Task 14: 入庫・出庫の印は、つながりの先頭（出庫）・末尾（入庫）の列車にだけ、それぞれ最初・最後の点に付く', () => {
        const p = trip({
            tripId: 'trip-p',
            tripNumber: 'P',
            depotOut: true,
            times: [
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'B',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'trip-q',
            tripNumber: 'Q',
            depotIn: true,
            times: [
                time({
                    stationId: 'B',
                    stopSequence: 1,
                    departureTime: '07:12:00',
                }),
                time({
                    stationId: 'C',
                    stopSequence: 2,
                    arrivalTime: '07:20:00',
                }),
            ],
        });

        const lines = buildChainDiagramLines({
            trips: [p, q],
            axis: smallAxis,
            axisStationIds: smallAxisStationIds,
            base,
            stationNameById: new Map(),
        });

        const pLine = lines.find((l) => l.tripId === 'trip-p');
        const qLine = lines.find((l) => l.tripId === 'trip-q');

        // P（先頭・出庫）の最初の点（A 7:00）に ◯
        expect(pLine?.depotMarks).toEqual([{ kind: 'out', minute: 180, y: 0 }]);
        // Q（末尾・入庫）の最後の点（C 7:20）に △
        expect(qLine?.depotMarks).toEqual([{ kind: 'in', minute: 200, y: 20 }]);
    });

    it('fix round 3: trip自身の最初/最後の時刻のある停車が軸の外なら、depotOut/depotIn が true でも depotMarks は空', () => {
        // Z（軸の外・他社線内）→ A → B → C → W（軸の外・他社線内）という
        // 他線直通の trip を想定。depotOut/depotIn は true だが、trip 自身の
        // 最初の停車(Z)・最後の停車(W)がどちらも軸の外なので、印を付けない。
        const solo = trip({
            tripId: 'trip-through',
            tripNumber: 'T',
            depotOut: true,
            depotIn: true,
            times: [
                time({
                    stationId: 'Z',
                    stopSequence: 1,
                    departureTime: '06:55:00',
                }),
                time({
                    stationId: 'A',
                    stopSequence: 2,
                    arrivalTime: '07:00:00',
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'B',
                    stopSequence: 3,
                    arrivalTime: '07:05:00',
                    departureTime: '07:05:00',
                }),
                time({
                    stationId: 'C',
                    stopSequence: 4,
                    arrivalTime: '07:10:00',
                    departureTime: '07:10:00',
                }),
                time({
                    stationId: 'W',
                    stopSequence: 5,
                    arrivalTime: '07:20:00',
                }),
            ],
        });

        const lines = buildChainDiagramLines({
            trips: [solo],
            axis: smallAxis,
            axisStationIds: smallAxisStationIds,
            base,
            stationNameById: new Map(),
        });

        // 線自体は軸上の区間（A〜C）だけ描かれる。
        expect(lines[0]?.tripId).toBe('trip-through');
        expect(lines[0]?.depotMarks).toEqual([]);
    });

    it('Task 14: depotIn/depotOut が無ければ depotMarks は空', () => {
        const solo = trip({
            tripId: 'trip-solo',
            tripNumber: 'S',
            times: [
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'B',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });

        const lines = buildChainDiagramLines({
            trips: [solo],
            axis: smallAxis,
            axisStationIds: smallAxisStationIds,
            base,
            stationNameById: new Map(),
        });

        expect(lines[0]?.depotMarks).toEqual([]);
    });

    it('つなぎ目で行を跳ぶ: 軸に B が 2 行ある形で、P は上の B の着まで、Q が上の B の着・発（停車の横線）→ 点線2本 → 下の B の着・発（同じ横線をもう一度）を持つ', () => {
        // 軸: A(0) B(10)[上] X(15)[他分岐専用・単独出現] B(20)[下] C(30)
        const axis = toAxis([
            ['A', 0],
            ['B', 10],
            ['X', 15],
            ['B', 20],
            ['C', 30],
        ]);
        const axisStationIds = new Set(['A', 'B', 'X', 'C']);

        const p = trip({
            tripId: 'trip-p',
            tripNumber: 'P',
            times: [
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'B',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'trip-q',
            tripNumber: 'Q',
            times: [
                time({
                    stationId: 'B',
                    stopSequence: 1,
                    departureTime: '07:12:00',
                }),
                time({
                    stationId: 'C',
                    stopSequence: 2,
                    arrivalTime: '07:40:00',
                }),
            ],
        });

        const lines = buildChainDiagramLines({
            trips: [p, q],
            axis,
            axisStationIds,
            base,
            stationNameById: new Map(),
        });

        const pLine = lines.find((l) => l.tripId === 'trip-p');
        const qLine = lines.find((l) => l.tripId === 'trip-q');

        // P は上の B（y=10）の着（共有点）まで
        expect(pLine?.segments).toEqual([
            [
                { minute: 180, y: 0 },
                { minute: 190, y: 10 },
            ],
        ]);
        expect(pLine?.connectors).toEqual([]);

        // Q は上の B（y=10）の着(190)・発(192、停車の横線)→点線2本→
        // 下の B（y=20）の着(190)・発(192、同じ横線をもう一度)→C(220)
        expect(qLine?.segments).toEqual([
            [
                { minute: 190, y: 10 },
                { minute: 192, y: 10 },
            ],
            [
                { minute: 190, y: 20 },
                { minute: 192, y: 20 },
                { minute: 220, y: 30 },
            ],
        ]);
        expect(qLine?.connectors).toEqual([
            { minute: 190, fromY: 10, toY: 20 },
            { minute: 192, fromY: 10, toY: 20 },
        ]);
    });

    it('直通先ラベル: P の最初の停車が軸の外・Q の最後の停車が軸の外 → P に「渋谷 →」、Q に「→ 海老名」だけ（つなぎ目には無し）', () => {
        const stationNameById = new Map([
            ['shibuya', '渋谷'],
            ['ebina', '海老名'],
        ]);

        const p = trip({
            tripId: 'trip-p',
            tripNumber: 'P',
            times: [
                time({
                    stationId: 'shibuya',
                    stopSequence: 1,
                    departureTime: '06:40:00',
                }),
                time({
                    stationId: 'A',
                    stopSequence: 2,
                    arrivalTime: '07:00:00',
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'B',
                    stopSequence: 3,
                    arrivalTime: '07:10:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'trip-q',
            tripNumber: 'Q',
            times: [
                time({
                    stationId: 'B',
                    stopSequence: 1,
                    departureTime: '07:12:00',
                }),
                time({
                    stationId: 'D',
                    stopSequence: 2,
                    arrivalTime: '07:30:00',
                }),
                time({
                    stationId: 'ebina',
                    stopSequence: 3,
                    arrivalTime: '07:45:00',
                }),
            ],
        });

        const lines = buildChainDiagramLines({
            trips: [p, q],
            axis: smallAxis,
            axisStationIds: smallAxisStationIds,
            base,
            stationNameById,
        });

        const pLine = lines.find((l) => l.tripId === 'trip-p');
        const qLine = lines.find((l) => l.tripId === 'trip-q');

        expect(pLine?.throughLabels).toEqual([
            { minute: 180, y: 0, text: '渋谷 →', anchor: 'end' },
        ]);
        expect(qLine?.throughLabels).toEqual([
            { minute: 210, y: 30, text: '→ 海老名', anchor: 'start' },
        ]);
    });

    it('fix (task-15): 3本の継走で末尾が軸に載る点を持たない（他社線内で終わる）→ 直通先ラベルは実際に線を持つ最後の列車（Q）に付く', () => {
        const stationNameById = new Map([['ebina', '海老名']]);

        // P(A→B, 軸上) → Q(B→meguro, meguro は軸の外) → R(meguro→ebina, 丸ごと軸の外)
        const p = trip({
            tripId: 'trip-p',
            tripNumber: 'P',
            times: [
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'B',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'trip-q',
            tripNumber: 'Q',
            times: [
                time({
                    stationId: 'B',
                    stopSequence: 1,
                    departureTime: '07:12:00',
                }),
                time({
                    stationId: 'meguro',
                    stopSequence: 2,
                    arrivalTime: '07:20:00',
                }),
            ],
        });
        const r = trip({
            tripId: 'trip-r',
            tripNumber: 'R',
            times: [
                time({
                    stationId: 'meguro',
                    stopSequence: 1,
                    departureTime: '07:22:00',
                }),
                time({
                    stationId: 'ebina',
                    stopSequence: 2,
                    arrivalTime: '07:30:00',
                }),
            ],
        });

        const lines = buildChainDiagramLines({
            trips: [p, q, r],
            axis: smallAxis,
            axisStationIds: smallAxisStationIds,
            base,
            stationNameById,
        });

        // R は軸に載る点を1つも持たないので線自体が作られない
        expect(lines.map((l) => l.tripId)).toEqual(['trip-p', 'trip-q']);

        const pLine = lines.find((l) => l.tripId === 'trip-p');
        const qLine = lines.find((l) => l.tripId === 'trip-q');

        expect(pLine?.throughLabels).toEqual([]);
        // ラベルは Q の最後の点（B の発、192分）に1つだけ付く
        expect(qLine?.throughLabels).toEqual([
            { minute: 192, y: 10, text: '→ 海老名', anchor: 'start' },
        ]);
    });

    it('fix (task-15): 3本の継走で先頭が軸に載る点を持たない（他社線内で始まる）→ 直通元ラベルは実際に線を持つ最初の列車（Q）に付く（対称ケース）', () => {
        const stationNameById = new Map([['shibuya', '渋谷']]);

        // R(shibuya→A, 丸ごと軸の外→軸上) → Q(A→meguro, meguro は軸の外) → P(meguro→B→C, 軸上)
        const r = trip({
            tripId: 'trip-r',
            tripNumber: 'R',
            times: [
                time({
                    stationId: 'shibuya',
                    stopSequence: 1,
                    departureTime: '06:50:00',
                }),
                time({
                    stationId: 'A',
                    stopSequence: 2,
                    arrivalTime: '07:00:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'trip-q',
            tripNumber: 'Q',
            times: [
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '07:02:00',
                }),
                time({
                    stationId: 'meguro',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });
        const p = trip({
            tripId: 'trip-p',
            tripNumber: 'P',
            times: [
                time({
                    stationId: 'meguro',
                    stopSequence: 1,
                    departureTime: '07:12:00',
                }),
                time({
                    stationId: 'B',
                    stopSequence: 2,
                    arrivalTime: '07:20:00',
                    departureTime: '07:20:00',
                }),
                time({
                    stationId: 'C',
                    stopSequence: 3,
                    arrivalTime: '07:30:00',
                }),
            ],
        });

        const lines = buildChainDiagramLines({
            trips: [r, q, p],
            axis: smallAxis,
            axisStationIds: smallAxisStationIds,
            base,
            stationNameById,
        });

        // R は軸に載る点を1つも持たないので線自体が作られない
        expect(lines.map((l) => l.tripId)).toEqual(['trip-q', 'trip-p']);

        const qLine = lines.find((l) => l.tripId === 'trip-q');
        const pLine = lines.find((l) => l.tripId === 'trip-p');

        // ラベルは Q の最初の点（A の着、180分）に1つだけ付く
        expect(qLine?.throughLabels).toEqual([
            { minute: 180, y: 0, text: '渋谷 →', anchor: 'end' },
        ]);
        expect(pLine?.throughLabels).toEqual([]);
    });

    it('3本の継走（種別・列番変更が2回）でも1本につながり、先頭だけ isChainHead', () => {
        const p = trip({
            tripId: 'trip-p',
            tripNumber: 'P',
            times: [
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'B',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'trip-q',
            tripNumber: 'Q',
            times: [
                time({
                    stationId: 'B',
                    stopSequence: 1,
                    departureTime: '07:10:00',
                }),
                time({
                    stationId: 'C',
                    stopSequence: 2,
                    arrivalTime: '07:20:00',
                }),
            ],
        });
        const r = trip({
            tripId: 'trip-r',
            tripNumber: 'R',
            times: [
                time({
                    stationId: 'C',
                    stopSequence: 1,
                    departureTime: '07:20:00',
                }),
                time({
                    stationId: 'D',
                    stopSequence: 2,
                    arrivalTime: '07:30:00',
                }),
            ],
        });

        const lines = buildChainDiagramLines({
            trips: [p, q, r],
            axis: smallAxis,
            axisStationIds: smallAxisStationIds,
            base,
            stationNameById: new Map(),
        });

        expect(lines.map((l) => l.tripId)).toEqual([
            'trip-p',
            'trip-q',
            'trip-r',
        ]);
        expect(lines.map((l) => l.isChainHead)).toEqual([true, false, false]);
    });
});

describe('buildChainDiagramLines: 線が切れる区間の推測', () => {
    // 9200 型: F(二俣川) T(鶴ヶ峰) N(西谷) K(上星川・他分岐) N(西谷の複製行) H(羽沢横浜国大)
    const branchAxis: StationAxis = [
        { stationId: 'F', y: 0 },
        { stationId: 'T', y: 10 },
        { stationId: 'N', y: 20 },
        { stationId: 'K', y: 30 },
        { stationId: 'N', y: 40, isDuplicate: true },
        { stationId: 'H', y: 50 },
    ];
    const branchAxisStationIds = new Set(['F', 'T', 'N', 'K', 'H']);
    const deadhead = trip({
        tripId: 'd1',
        tripNumber: '9200',
        times: [
            time({
                stationId: 'F',
                stopSequence: 1,
                departureTime: '07:00:00',
            }),
            time({ stationId: 'T', stopSequence: 2 }),
            time({ stationId: 'N', stopSequence: 3 }),
            time({ stationId: 'H', stopSequence: 4, arrivalTime: '07:06:00' }),
        ],
    });
    const minuteOf = (hhmm: number) => hhmm - 4 * 60;

    it('標準の運転時間を渡さなければ、途中駅の時刻が空の分断区間は線にならない', () => {
        expect(
            buildChainDiagramLines({
                trips: [deadhead],
                axis: branchAxis,
                axisStationIds: branchAxisStationIds,
                base,
                stationNameById: new Map(),
            }),
        ).toEqual([]);
    });

    it('標準の運転時間の比率で途中駅を埋め、分岐駅で行を跳んで羽沢まで線が届く。推測した駅に分の字は付けない', () => {
        const [line] = buildChainDiagramLines({
            trips: [deadhead],
            axis: branchAxis,
            axisStationIds: branchAxisStationIds,
            base,
            stationNameById: new Map(),
            standardRunMinutes: new Map([
                ['F>T', 3],
                ['T>N', 1],
                ['N>H', 2],
            ]),
        });

        expect(line.segments).toEqual([
            [
                { minute: minuteOf(7 * 60), y: 0 },
                { minute: minuteOf(7 * 60 + 3), y: 10 },
                { minute: minuteOf(7 * 60 + 4), y: 20 },
            ],
            [
                { minute: minuteOf(7 * 60 + 4), y: 40 },
                { minute: minuteOf(7 * 60 + 6), y: 50 },
            ],
        ]);
        expect(line.connectors).toEqual([
            { minute: minuteOf(7 * 60 + 4), fromY: 20, toY: 40 },
        ]);
        expect(line.stopLabels.map((label) => label.text)).toEqual([
            '00',
            '06',
        ]);
    });
});

describe('buildChainStopIndexObservations', () => {
    it('trips が空なら空配列', () => {
        expect(buildChainStopIndexObservations([], ['A', 'B'])).toEqual([]);
    });

    it('2停車の単純な1本 → 区間1つぶんの観測', () => {
        const t = trip({
            tripId: 't1',
            tripNumber: 'T',
            times: [
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'B',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });

        expect(buildChainStopIndexObservations([t], ['A', 'B'])).toEqual([
            { tripId: 't1', fromIndex: 0, toIndex: 1, minutes: 10 },
        ]);
    });

    it('他分岐駅を挟んで分断される区間は観測にしない（連続する区間だけ観測を作る）', () => {
        // 軸: A(0) B(1) X(2)[他分岐専用・単独出現] C(3)。t1 は A→B→C の順に停車するが
        // B→C は軸上で X を挟むため分断（B→X→C は経由しない）。
        const t = trip({
            tripId: 't1',
            tripNumber: 'T',
            times: [
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'B',
                    stopSequence: 2,
                    arrivalTime: '07:05:00',
                    departureTime: '07:06:00',
                }),
                time({
                    stationId: 'C',
                    stopSequence: 3,
                    arrivalTime: '07:20:00',
                }),
            ],
        });

        expect(
            buildChainStopIndexObservations([t], ['A', 'B', 'X', 'C']),
        ).toEqual([{ tripId: 't1', fromIndex: 0, toIndex: 1, minutes: 5 }]);
    });

    it('同じ駅の2つの行のあいだ（跳びの点線）は観測にしない。つなぎ目は所有列車ごとに正しく分かれる', () => {
        // build-chain-diagram-lines.util.spec.ts の「つなぎ目で行を跳ぶ」テストと同じ軸・列車。
        const axisStationOrder = ['A', 'B', 'X', 'B', 'C'];

        const p = trip({
            tripId: 'trip-p',
            tripNumber: 'P',
            times: [
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'B',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'trip-q',
            tripNumber: 'Q',
            times: [
                time({
                    stationId: 'B',
                    stopSequence: 1,
                    departureTime: '07:12:00',
                }),
                time({
                    stationId: 'C',
                    stopSequence: 2,
                    arrivalTime: '07:40:00',
                }),
            ],
        });

        const observations = buildChainStopIndexObservations(
            [p, q],
            axisStationOrder,
        );

        expect(observations).toEqual([
            { tripId: 'trip-p', fromIndex: 0, toIndex: 1, minutes: 10 },
            { tripId: 'trip-q', fromIndex: 3, toIndex: 4, minutes: 28 },
        ]);
    });
});
