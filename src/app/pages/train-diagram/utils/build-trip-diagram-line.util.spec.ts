import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { StationAxis } from 'src/app/shared/diagram-scale';
import { buildTripDiagramLine } from './build-trip-diagram-line.util';

/** テスト用: `stationId -> y` の Map から StationAxis（順序付き配列）を組み立てる。 */
function toAxis(entries: readonly (readonly [string, number])[]): StationAxis {
    return entries.map(([stationId, y]) => ({ stationId, y }));
}

const base = new Date(2026, 6, 20, 0, 0, 0, 0);
const windowStart = new Date(2026, 6, 20, 7, 0, 0, 0);

function time(params: {
    stationId: string;
    stopSequence: number;
    arrivalTime?: string;
    departureTime?: string;
    arrivalDays?: number;
    departureDays?: number;
    stationName?: string;
}): TimeDetailsDto {
    return {
        timeId: `${params.stationId}-${params.stopSequence}`,
        stationId: params.stationId,
        stopSequence: params.stopSequence,
        arrivalTime: params.arrivalTime,
        departureTime: params.departureTime,
        // days は 1-based（day 1 = 営業日当日）。未指定は当日とみなす。
        arrivalDays: params.arrivalDays ?? 1,
        departureDays: params.departureDays ?? 1,
        station: params.stationName
            ? ({ stationName: params.stationName } as any)
            : undefined,
    } as TimeDetailsDto;
}

const axis = toAxis([
    ['yokohama', 0],
    ['hoshikawa', 10],
    ['futamatagawa', 25],
]);

describe('buildTripDiagramLine', () => {
    const commonParams = {
        axis,
        axisStationIds: new Set(['yokohama', 'hoshikawa', 'futamatagawa']),
        // 経由路線判定に使う情報がない（既定＝分断しない）テスト群のデフォルト。
        routeIdsByStation: new Map<string, ReadonlySet<string>>(),
        base,
        windowStart,
        pxPerMinute: 8,
        axisPxPerMinute: 6,
        headerHeight: 32,
    };

    it('停車駅を stopSequence 順に点へ変換する', () => {
        const trip: TripDetailsDto = {
            tripId: 'trip-1',
            tripNumber: '5001',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#8a8a8a' } as any,
            times: [
                time({
                    stationId: 'yokohama',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'hoshikawa',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                    departureTime: '07:10:00',
                }),
                time({
                    stationId: 'futamatagawa',
                    stopSequence: 3,
                    arrivalTime: '07:25:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({ trip, ...commonParams });

        expect(line?.tripId).toBe('trip-1');
        expect(line?.tripNumber).toBe('5001');
        expect(line?.tripClassColor).toBe('#8a8a8a');
        expect(line?.isDeadhead).toBe(false);
        // 横浜発(x=0) → 星川着/発(x=80, 停車0分なので同一点) → 二俣川着(x=200)
        expect(line?.segments).toEqual([
            [
                { x: 0, y: 32 },
                { x: 80, y: 92 },
                { x: 200, y: 182 },
            ],
        ]);
    });

    it('同駅で着発の時刻差がある場合は水平線分（待避）になる', () => {
        const trip: TripDetailsDto = {
            tripId: 'trip-2',
            tripNumber: '2002',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#1e88e5' } as any,
            times: [
                time({
                    stationId: 'yokohama',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'hoshikawa',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                    departureTime: '07:15:00',
                }),
                time({
                    stationId: 'futamatagawa',
                    stopSequence: 3,
                    arrivalTime: '07:25:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({ trip, ...commonParams });

        // 星川で着(x=80,y=92)→発(x=120,y=92) の水平線分が挟まる
        expect(line?.segments).toEqual([
            [
                { x: 0, y: 32 },
                { x: 80, y: 92 },
                { x: 120, y: 92 },
                { x: 200, y: 182 },
            ],
        ]);
    });

    it('駅軸を跨いで先へ続く列車には終端に行先ラベルを付す', () => {
        const trip: TripDetailsDto = {
            tripId: 'trip-3',
            tripNumber: '3003',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#43a047' } as any,
            times: [
                time({
                    stationId: 'yokohama',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'futamatagawa',
                    stopSequence: 2,
                    arrivalTime: '07:25:00',
                    departureTime: '07:26:00',
                }),
                time({
                    stationId: 'shonandai',
                    stopSequence: 3,
                    arrivalTime: '07:50:00',
                    stationName: '湘南台',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({ trip, ...commonParams });

        expect(line?.throughLabels).toEqual([
            { x: 208, y: 182, text: '→ 湘南台', anchor: 'start' },
        ]);
    });

    it('軸の手前から続く列車には起点側にラベルを付す', () => {
        const trip: TripDetailsDto = {
            tripId: 'trip-4',
            tripNumber: '4004',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#43a047' } as any,
            times: [
                time({
                    stationId: 'shonandai',
                    stopSequence: 1,
                    departureTime: '06:40:00',
                    stationName: '湘南台',
                }),
                time({
                    stationId: 'futamatagawa',
                    stopSequence: 2,
                    arrivalTime: '07:05:00',
                    departureTime: '07:06:00',
                }),
                time({
                    stationId: 'yokohama',
                    stopSequence: 3,
                    arrivalTime: '07:25:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({ trip, ...commonParams });

        expect(line?.throughLabels).toEqual([
            { x: 40, y: 182, text: '湘南台 →', anchor: 'end' },
        ]);
    });

    it('駅軸上の停車が 1 駅以下なら undefined を返す', () => {
        const trip: TripDetailsDto = {
            tripId: 'trip-5',
            tripNumber: '5005',
            times: [
                time({
                    stationId: 'yokohama',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
            ],
        } as TripDetailsDto;

        expect(buildTripDiagramLine({ trip, ...commonParams })).toBeUndefined();
    });

    it('tripClassId が無い（回送）場合は isDeadhead が true になる', () => {
        const trip: TripDetailsDto = {
            tripId: 'trip-6',
            tripNumber: '',
            times: [
                time({
                    stationId: 'yokohama',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'hoshikawa',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({ trip, ...commonParams });
        expect(line?.isDeadhead).toBe(true);
        expect(line?.tripClassColor).toBe('#8a8a8a');
    });
});

describe('buildTripDiagramLine: 経由路線に基づく区間分断（issue2）', () => {
    // 二俣川(futamatagawa)と希望ヶ丘(hoshikawagaoka)の間に、網羅軸上は
    // いずみ野線専用駅(izumino1/izumino2)が挟まる想定（本線とは物理的に別区間）。
    const splitAxisStationOrder = [
        'yokohama',
        'futamatagawa',
        'izumino1',
        'izumino2',
        'hoshikawagaoka',
    ];
    const splitAxis = toAxis([
        ['yokohama', 0],
        ['futamatagawa', 25],
        ['izumino1', 30],
        ['izumino2', 35],
        ['hoshikawagaoka', 50],
    ]);
    const routeIdsByStation = new Map<string, ReadonlySet<string>>([
        ['yokohama', new Set(['main'])],
        ['futamatagawa', new Set(['main', 'izumino'])],
        ['izumino1', new Set(['izumino'])],
        ['izumino2', new Set(['izumino'])],
        ['hoshikawagaoka', new Set(['main'])],
    ]);
    const splitCommonParams = {
        axis: splitAxis,
        axisStationIds: new Set(splitAxisStationOrder),
        routeIdsByStation,
        base,
        windowStart,
        pxPerMinute: 8,
        axisPxPerMinute: 6,
        headerHeight: 32,
    };

    it('経由しない分岐区間（他路線専用駅）を跨ぐ場合は線を分断する', () => {
        const trip: TripDetailsDto = {
            tripId: 'trip-split',
            tripNumber: '7001',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#8a8a8a' } as any,
            times: [
                time({
                    stationId: 'yokohama',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'futamatagawa',
                    stopSequence: 2,
                    arrivalTime: '07:20:00',
                    departureTime: '07:20:00',
                }),
                time({
                    stationId: 'hoshikawagaoka',
                    stopSequence: 3,
                    arrivalTime: '07:40:00',
                    departureTime: '07:41:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({ trip, ...splitCommonParams });

        // futamatagawa→hoshikawagaoka の間は本線が経由しないいずみ野線専用駅を跨ぐため分断される
        expect(line?.segments).toEqual([
            [
                { x: 0, y: 32 },
                { x: 160, y: 182 },
            ],
            [
                { x: 320, y: 332 },
                { x: 328, y: 332 },
            ],
        ]);
    });

    it('経由路線内の通過駅（停車しない駅）を跨ぐだけなら分断しない', () => {
        const noSplitAxisStationOrder = [
            'yokohama',
            'mainPass',
            'hoshikawagaoka2',
        ];
        const noSplitAxis = toAxis([
            ['yokohama', 0],
            ['mainPass', 10],
            ['hoshikawagaoka2', 25],
        ]);
        const noSplitRouteIdsByStation = new Map<string, ReadonlySet<string>>([
            ['yokohama', new Set(['main'])],
            ['mainPass', new Set(['main'])],
            ['hoshikawagaoka2', new Set(['main'])],
        ]);

        const trip: TripDetailsDto = {
            tripId: 'trip-nosplit',
            tripNumber: '7002',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#8a8a8a' } as any,
            times: [
                time({
                    stationId: 'yokohama',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'hoshikawagaoka2',
                    stopSequence: 2,
                    arrivalTime: '07:25:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({
            trip,
            axis: noSplitAxis,
            axisStationIds: new Set(noSplitAxisStationOrder),
            routeIdsByStation: noSplitRouteIdsByStation,
            base,
            windowStart,
            pxPerMinute: 8,
            axisPxPerMinute: 6,
            headerHeight: 32,
        });

        expect(line?.segments).toEqual([
            [
                { x: 0, y: 32 },
                { x: 200, y: 182 },
            ],
        ]);
    });

    it('接続駅が複製挿入された軸では、本線のみの列車が接続駅で分割されつつ経由区間が復活する', () => {
        // 二俣川(futamatagawa)の複製が希望ヶ丘(hoshikawagaoka)の直前にも存在する軸
        // （buildStationAxis の複製挿入結果を模したフィクスチャ）。
        const dupAxisStationOrder = [
            'yokohama',
            'futamatagawa',
            'izumino1',
            'izumino2',
            'futamatagawa',
            'hoshikawagaoka',
        ];
        const dupAxis = toAxis([
            ['yokohama', 0],
            ['futamatagawa', 25],
            ['izumino1', 30],
            ['izumino2', 35],
            ['futamatagawa', 40],
            ['hoshikawagaoka', 50],
        ]);

        const trip: TripDetailsDto = {
            tripId: 'trip-dup',
            tripNumber: '7003',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#8a8a8a' } as any,
            times: [
                time({
                    stationId: 'yokohama',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'futamatagawa',
                    stopSequence: 2,
                    arrivalTime: '07:20:00',
                    departureTime: '07:20:00',
                }),
                time({
                    stationId: 'hoshikawagaoka',
                    stopSequence: 3,
                    arrivalTime: '07:40:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({
            trip,
            axis: dupAxis,
            axisStationIds: new Set(dupAxisStationOrder),
            routeIdsByStation,
            base,
            windowStart,
            pxPerMinute: 8,
            axisPxPerMinute: 6,
            headerHeight: 32,
        });

        // 1本目: 横浜→二俣川(元の occurrence, y=25*6+32=182) で終わる
        // 2本目: 二俣川(複製 occurrence, y=40*6+32=272) → 希望ヶ丘(y=332) で始まる
        // （二俣川→希望ヶ丘の経由区間が、いずみ野線を横切らずに復活している）
        expect(line?.segments).toEqual([
            [
                { x: 0, y: 32 },
                { x: 160, y: 182 },
            ],
            [
                { x: 160, y: 272 },
                { x: 320, y: 332 },
            ],
        ]);
    });
});

describe('buildTripDiagramLine: 直通列車（複数路線を跨ぐ trip）の経由判定はペア単位で行う', () => {
    // 路線A: [a1, a2, J] / 路線B: [J, b1, b2]（J は接続駅）。
    // trip 全体の routeIds 積集合は A∩B = 空になるため、trip 単位の判定では
    // 全ペアが「判定不能→分断しない」に倒れて x1（他路線駅）を直線横断してしまう。
    // ペア単位なら (J,b1) は路線 B 所属と判定され、x1 が interloper として検出される。
    const routeIdsByStation = new Map<string, ReadonlySet<string>>([
        ['a1', new Set(['routeA'])],
        ['a2', new Set(['routeA'])],
        ['J', new Set(['routeA', 'routeB'])],
        ['x1', new Set(['routeC'])],
        ['b1', new Set(['routeB'])],
        ['b2', new Set(['routeB'])],
    ]);

    function throughTrip(): TripDetailsDto {
        return {
            tripId: 'trip-through',
            tripNumber: '208092',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#8a8a8a' } as any,
            times: [
                time({
                    stationId: 'a1',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'a2',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                    departureTime: '07:10:00',
                }),
                time({
                    stationId: 'J',
                    stopSequence: 3,
                    arrivalTime: '07:20:00',
                    departureTime: '07:20:00',
                }),
                time({
                    stationId: 'b1',
                    stopSequence: 4,
                    arrivalTime: '07:30:00',
                    departureTime: '07:30:00',
                }),
                time({
                    stationId: 'b2',
                    stopSequence: 5,
                    arrivalTime: '07:40:00',
                }),
            ],
        } as TripDetailsDto;
    }

    it('経由しない他路線駅（x1）を横切らず、接続駅（J）で分断される', () => {
        const throughAxisOrder = ['a1', 'a2', 'J', 'x1', 'b1', 'b2'];
        const throughAxis = toAxis([
            ['a1', 0],
            ['a2', 10],
            ['J', 20],
            ['x1', 30],
            ['b1', 40],
            ['b2', 50],
        ]);

        const line = buildTripDiagramLine({
            trip: throughTrip(),
            axis: throughAxis,
            axisStationIds: new Set(throughAxisOrder),
            routeIdsByStation,
            base,
            windowStart,
            pxPerMinute: 8,
            axisPxPerMinute: 6,
            headerHeight: 32,
        });

        // (J,b1) 間の x1 が interloper と判定され、J→b1 で分断される
        // （x1 の y=212 をどの線分も横切らない）。
        expect(line?.segments).toEqual([
            [
                { x: 0, y: 32 },
                { x: 80, y: 92 },
                { x: 160, y: 152 },
            ],
            [
                { x: 240, y: 272 },
                { x: 320, y: 332 },
            ],
        ]);
    });

    it('接続駅（J）の複製 occurrence がある軸では複製経由で連結される（x1 は横切らない）', () => {
        const dupAxisOrder = ['a1', 'a2', 'J', 'x1', 'J', 'b1', 'b2'];
        const dupAxis = toAxis([
            ['a1', 0],
            ['a2', 10],
            ['J', 20],
            ['x1', 30],
            ['J', 40],
            ['b1', 50],
            ['b2', 60],
        ]);

        const line = buildTripDiagramLine({
            trip: throughTrip(),
            axis: dupAxis,
            axisStationIds: new Set(dupAxisOrder),
            routeIdsByStation,
            base,
            windowStart,
            pxPerMinute: 8,
            axisPxPerMinute: 6,
            headerHeight: 32,
        });

        // 1本目: a1→a2→J(元 occurrence, y=152)。
        // 2本目: J(複製 occurrence, y=272)→b1→b2（x1 を横切らずに連結）。
        expect(line?.segments).toEqual([
            [
                { x: 0, y: 32 },
                { x: 80, y: 92 },
                { x: 160, y: 152 },
            ],
            [
                { x: 160, y: 272 },
                { x: 240, y: 332 },
                { x: 320, y: 392 },
            ],
        ]);
    });
});
