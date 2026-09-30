import { toAbsoluteTime } from 'src/app/core/utils/railway-day';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { StationAxis } from 'src/app/shared/diagram-scale';
import {
    buildTripDiagramLine,
    resolveArrival,
    resolveDeparture,
} from './build-trip-diagram-line.util';

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
    arrivalDays?: number;
    departureDays?: number;
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
        base,
        stationNameById: new Map([
            ['yokohama', '横浜'],
            ['hoshikawa', '星川'],
            ['futamatagawa', '二俣川'],
            ['shibuya', '渋谷'],
            ['ebina', '海老名'],
        ]),
    };

    // 横浜07:00発・星川07:10着発・二俣川07:25着
    const basicTrip: TripDetailsDto = {
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

    it('停車駅を stopSequence 順に点へ変換する', () => {
        const line = buildTripDiagramLine({ ...commonParams, trip: basicTrip });

        expect(line?.tripId).toBe('trip-1');
        expect(line?.tripNumber).toBe('5001');
        expect(line?.tripClassColor).toBe('#8a8a8a');
        expect(line?.isDeadhead).toBe(false);
        // 横浜発(07:00=180分) → 星川着/発(07:10=190分、停車0分なので同一点) → 二俣川着(07:25=205分)
        expect(line?.segments).toEqual([
            [
                { minute: 180, y: 0 },
                { minute: 190, y: 10 },
                { minute: 205, y: 25 },
            ],
        ]);
    });

    it('最小・最大の分を持つ', () => {
        const line = buildTripDiagramLine({ ...commonParams, trip: basicTrip });
        expect(line?.minMinute).toBe(180);
        expect(line?.maxMinute).toBe(205);
    });

    it('停車の分の字: 発車の分（無ければ到着の分）を 2 桁で、停車ごとに 1 つ', () => {
        const line = buildTripDiagramLine({ ...commonParams, trip: basicTrip });
        expect(line?.stopLabels).toEqual([
            { minute: 180, y: 0, text: '00', side: 'above' },
            { minute: 190, y: 10, text: '10', side: 'above' },
            { minute: 205, y: 25, text: '25', side: 'above' },
        ]);
    });

    it('直通先ラベル: 軸の外の始発・終着の駅名を駅名表から引く', () => {
        const trip = {
            tripId: 't-through',
            tripNumber: '1234',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#3f51b5' } as any,
            times: [
                time({
                    stationId: 'shibuya',
                    stopSequence: 1,
                    departureTime: '06:40:00',
                }),
                time({
                    stationId: 'yokohama',
                    stopSequence: 2,
                    arrivalTime: '07:00:00',
                    departureTime: '07:00:00',
                }),
                // hoshikawa（軸上、yokohama と futamatagawa の間）を通過する
                // （停車しない＝発着なしの行）。これが無いと yokohama→futamatagawa
                // が「経由しない区間を跨ぐ」と判定され分断される。
                time({ stationId: 'hoshikawa', stopSequence: 3 }),
                time({
                    stationId: 'futamatagawa',
                    stopSequence: 4,
                    arrivalTime: '07:25:00',
                    departureTime: '07:25:00',
                }),
                time({
                    stationId: 'ebina',
                    stopSequence: 5,
                    arrivalTime: '07:45:00',
                }),
            ],
        } as TripDetailsDto;
        const line = buildTripDiagramLine({ ...commonParams, trip });
        expect(line?.throughLabels).toEqual([
            { minute: 180, y: 0, text: '渋谷 →', anchor: 'end' },
            { minute: 205, y: 25, text: '→ 海老名', anchor: 'start' },
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

        const line = buildTripDiagramLine({ ...commonParams, trip });

        // 星川で着(190分,y=10)→発(195分,y=10) の水平線分が挟まる
        expect(line?.segments).toEqual([
            [
                { minute: 180, y: 0 },
                { minute: 190, y: 10 },
                { minute: 195, y: 10 },
                { minute: 205, y: 25 },
            ],
        ]);
    });

    it('駅軸を跨いで先へ続く列車には終端に行先ラベルを付す', () => {
        const stationNameById = new Map(commonParams.stationNameById);
        stationNameById.set('shonandai', '湘南台');
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
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({
            ...commonParams,
            stationNameById,
            trip,
        });

        expect(line?.throughLabels).toEqual([
            { minute: 206, y: 25, text: '→ 湘南台', anchor: 'start' },
        ]);
    });

    it('軸の手前から続く列車には起点側にラベルを付す', () => {
        const stationNameById = new Map(commonParams.stationNameById);
        stationNameById.set('shonandai', '湘南台');
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

        const line = buildTripDiagramLine({
            ...commonParams,
            stationNameById,
            trip,
        });

        expect(line?.throughLabels).toEqual([
            { minute: 185, y: 25, text: '湘南台 →', anchor: 'end' },
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

        expect(buildTripDiagramLine({ ...commonParams, trip })).toBeUndefined();
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

        const line = buildTripDiagramLine({ ...commonParams, trip });
        expect(line?.isDeadhead).toBe(true);
        expect(line?.tripClassColor).toBe('#8a8a8a');
    });
});

describe('buildTripDiagramLine: trip 自身が経由する区間に基づく区間分断（issue2、Task 11 フォローアップで経由路線判定から trip 自身の times 判定に変更）', () => {
    // 二俣川(futamatagawa)と希望ヶ丘(hoshikawagaoka)の間に、網羅軸上は
    // いずみ野線専用駅(izumino1/izumino2)が挟まる想定（本線とは物理的に別区間）。
    // この trip の times には izumino1/izumino2 の行が無い（＝実際には経由しない）。
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
    const splitCommonParams = {
        axis: splitAxis,
        axisStationIds: new Set(splitAxisStationOrder),
        base,
        stationNameById: new Map<string, string>(),
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
                { minute: 180, y: 0 },
                { minute: 200, y: 25 },
            ],
            [
                { minute: 220, y: 50 },
                { minute: 221, y: 50 },
            ],
        ]);
    });

    it('trip 自身が実際に通過する駅（停車しない・times に発着なしの行を持つ）を跨ぐだけなら分断しない', () => {
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
                // 停車しない通過駅: 発着とも欠落した行として times に現れる
                // （stopSequence だけが埋まっている）。
                time({ stationId: 'mainPass', stopSequence: 2 }),
                time({
                    stationId: 'hoshikawagaoka2',
                    stopSequence: 3,
                    arrivalTime: '07:25:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({
            trip,
            axis: noSplitAxis,
            axisStationIds: new Set(noSplitAxisStationOrder),
            base,
            stationNameById: new Map<string, string>(),
        });

        expect(line?.segments).toEqual([
            [
                { minute: 180, y: 0 },
                { minute: 205, y: 25 },
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
            base,
            stationNameById: new Map<string, string>(),
        });

        // 1本目: 横浜→二俣川(元の occurrence, y=25) で終わる
        // 2本目: 二俣川(複製 occurrence, y=40) → 希望ヶ丘(y=50) で始まる
        // （二俣川→希望ヶ丘の経由区間が、いずみ野線を横切らずに復活している）
        expect(line?.segments).toEqual([
            [
                { minute: 180, y: 0 },
                { minute: 200, y: 25 },
            ],
            [
                { minute: 200, y: 40 },
                { minute: 220, y: 50 },
            ],
        ]);
        // 二俣川で跳ぶため、つなぎ線が 1 本引かれる（発車の分・跳ぶ前後の y）。
        expect(line?.connectors).toEqual([{ minute: 200, fromY: 25, toY: 40 }]);
    });

    it('接続駅の複製で再描画された停車（newSegment）でも、停車の分の字は二重に出さない', () => {
        // 上のテストと同じ軸・trip: 二俣川(futamatagawa)が複製 occurrence(y=40) で
        // 再描画される（newSegment）が、既に y=25 側で '20' の字を付けているため、
        // 同じ stop の字を二度出してはいけない。
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
            tripId: 'trip-dup-label',
            tripNumber: '7004',
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
            base,
            stationNameById: new Map<string, string>(),
        });

        // futamatagawa は y=25 と y=40 の 2 occurrence に描かれるが、字（'20'）は 1 つだけ。
        const futamatagawaLabels = line?.stopLabels.filter(
            (label) => label.text === '20',
        );
        expect(futamatagawaLabels).toHaveLength(1);
        expect(line?.stopLabels).toEqual([
            { minute: 180, y: 0, text: '00', side: 'above' },
            { minute: 200, y: 25, text: '20', side: 'above' },
            { minute: 220, y: 50, text: '40', side: 'above' },
        ]);
    });
});

describe('buildTripDiagramLine: Task 19 停車分ラベルの上下（side）判定', () => {
    it('下り（yが大きくなる方向）は全て above（従来どおり線の上）', () => {
        // 横浜(y=0)→星川(y=10)→二俣川(y=25): y が増える＝下り
        const downTrip: TripDetailsDto = {
            tripId: 'trip-down',
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
        const line = buildTripDiagramLine({
            axis,
            axisStationIds: new Set(['yokohama', 'hoshikawa', 'futamatagawa']),
            base,
            stationNameById: new Map(),
            trip: downTrip,
        });
        expect(line?.stopLabels.map((l) => l.side)).toEqual([
            'above',
            'above',
            'above',
        ]);
    });

    it('上り（yが小さくなる方向）は全て below（線の下）。最後の停車は1つ前の点で判定する', () => {
        // 二俣川(y=25)発→星川(y=10、停車07:10着〜07:15発の5分待避＝横線)→横浜(y=0)着: y が減る＝上り
        const upTrip: TripDetailsDto = {
            tripId: 'trip-up',
            tripNumber: '6001',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#8a8a8a' } as any,
            times: [
                time({
                    stationId: 'futamatagawa',
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
                    stationId: 'yokohama',
                    stopSequence: 3,
                    arrivalTime: '07:25:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({
            axis,
            axisStationIds: new Set(['yokohama', 'hoshikawa', 'futamatagawa']),
            base,
            stationNameById: new Map(),
            trip: upTrip,
        });

        // 停車の分の字は発車の分（無ければ到着）: 二俣川「00」・星川「15」・横浜「25」
        expect(line?.stopLabels).toEqual([
            { minute: 180, y: 25, text: '00', side: 'below' },
            { minute: 195, y: 10, text: '15', side: 'below' },
            { minute: 205, y: 0, text: '25', side: 'below' },
        ]);
    });
});

describe('buildTripDiagramLine: 直通列車（複数路線を跨ぐ trip）の経由判定はペア単位で行う', () => {
    // 路線A: [a1, a2, J] / 路線B: [J, b1, b2]（J は接続駅）。x1 は他路線専用駅で
    // trip の times には一切現れない。連続停車ペアごとに区切って trip 自身の
    // times を見るため、(J,b1) 間に x1 が interloper として正しく検出される。
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
            base,
            stationNameById: new Map<string, string>(),
        });

        // (J,b1) 間の x1 が interloper と判定され、J→b1 で分断される
        // （x1 の y=30 をどの線分も横切らない）。
        expect(line?.segments).toEqual([
            [
                { minute: 180, y: 0 },
                { minute: 190, y: 10 },
                { minute: 200, y: 20 },
            ],
            [
                { minute: 210, y: 40 },
                { minute: 220, y: 50 },
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
            base,
            stationNameById: new Map<string, string>(),
        });

        // 1本目: a1→a2→J(元 occurrence, y=20)。
        // 2本目: J(複製 occurrence, y=40)→b1→b2（x1 を横切らずに連結）。
        expect(line?.segments).toEqual([
            [
                { minute: 180, y: 0 },
                { minute: 190, y: 10 },
                { minute: 200, y: 20 },
            ],
            [
                { minute: 200, y: 40 },
                { minute: 210, y: 50 },
                { minute: 220, y: 60 },
            ],
        ]);
        // J で跳ぶため、つなぎ線が 1 本引かれる。
        expect(line?.connectors).toEqual([{ minute: 200, fromY: 20, toY: 40 }]);
    });
});

describe('buildTripDiagramLine: 分岐駅で線を途切れさせない（停車駅の並び全体で跳びが最少になる選び方）', () => {
    // 軸: A(0) H(10) Y(20) K(30) H'(40) N(50) F(60) I1(70) I2(80) F'(90) G(100)
    // （H と H' は同じ駅 'h'、F と F' は同じ駅 'f'。実データの新横浜線・本線・いずみ野線の
    // 分岐構造を模したフィクスチャ）。
    // 路線: 新横浜線 = a, h, n ／ 本線 = y, k, n, f, g ／ いずみ野線 = f, i1, i2
    const branchAxisStationOrder = [
        'a',
        'h',
        'y',
        'k',
        'h',
        'n',
        'f',
        'i1',
        'i2',
        'f',
        'g',
    ];
    const branchAxis = toAxis([
        ['a', 0],
        ['h', 10],
        ['y', 20],
        ['k', 30],
        ['h', 40],
        ['n', 50],
        ['f', 60],
        ['i1', 70],
        ['i2', 80],
        ['f', 90],
        ['g', 100],
    ]);
    const branchCommonParams = {
        axis: branchAxis,
        axisStationIds: new Set(branchAxisStationOrder),
        base,
        stationNameById: new Map<string, string>(),
    };

    it('本線 y→k→n: 複製の羽沢横浜国大(H)を挟んでも切れない（segment 1本・connector 0）', () => {
        const trip: TripDetailsDto = {
            tripId: 'trip-ykn',
            tripNumber: '1',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#8a8a8a' } as any,
            times: [
                time({
                    stationId: 'y',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'k',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                    departureTime: '07:10:00',
                }),
                time({
                    stationId: 'n',
                    stopSequence: 3,
                    arrivalTime: '07:25:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({ trip, ...branchCommonParams });

        expect(line?.segments).toEqual([
            [
                { minute: 180, y: 20 },
                { minute: 190, y: 30 },
                { minute: 205, y: 50 },
            ],
        ]);
        expect(line?.connectors).toEqual([]);
    });

    it('新横浜線 a→h→n: h で跳ぶ（segment 2本・connector 1、minute は h の発車、fromY 10、toY 40）', () => {
        const trip: TripDetailsDto = {
            tripId: 'trip-ahn',
            tripNumber: '2',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#8a8a8a' } as any,
            times: [
                time({
                    stationId: 'a',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'h',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                    departureTime: '07:10:00',
                }),
                time({
                    stationId: 'n',
                    stopSequence: 3,
                    arrivalTime: '07:40:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({ trip, ...branchCommonParams });

        expect(line?.segments).toEqual([
            [
                { minute: 180, y: 0 },
                { minute: 190, y: 10 },
            ],
            [
                { minute: 190, y: 40 },
                { minute: 220, y: 50 },
            ],
        ]);
        expect(line?.connectors).toEqual([{ minute: 190, fromY: 10, toY: 40 }]);
    });

    it('新横浜線 a→h→n・h に停車あり: 跳んだ先（dep側の行）にも同じ停車の横線をもう一度描き、つなぎ線は着・発の2本（矩形になる）', () => {
        const trip: TripDetailsDto = {
            tripId: 'trip-ahn-dwell',
            tripNumber: '2b',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#8a8a8a' } as any,
            times: [
                time({
                    stationId: 'a',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'h',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                    departureTime: '07:12:00',
                }),
                time({
                    stationId: 'n',
                    stopSequence: 3,
                    arrivalTime: '07:40:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({ trip, ...branchCommonParams });

        // 着側(y=10)は着(190)・発(192)の停車の横線を持つ。dep側(y=40)は着(190)から
        // 始まり発(192)まで、同じ停車の横線をもう一度描く。
        expect(line?.segments).toEqual([
            [
                { minute: 180, y: 0 },
                { minute: 190, y: 10 },
                { minute: 192, y: 10 },
            ],
            [
                { minute: 190, y: 40 },
                { minute: 192, y: 40 },
                { minute: 220, y: 50 },
            ],
        ]);
        // 着の分・発の分の2本のつなぎ線（横線2本と合わせて矩形になる）。
        expect(line?.connectors).toEqual([
            { minute: 190, fromY: 10, toY: 40 },
            { minute: 192, fromY: 10, toY: 40 },
        ]);
    });

    it('いずみ野線の上り i2→i1→f→n（f で本線へ続く）: f は 60 を選び、90 を選ばない（segment 1本・connector 0）', () => {
        const trip: TripDetailsDto = {
            tripId: 'trip-i2i1fn',
            tripNumber: '3',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#8a8a8a' } as any,
            times: [
                time({
                    stationId: 'i2',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'i1',
                    stopSequence: 2,
                    arrivalTime: '07:05:00',
                    departureTime: '07:05:00',
                }),
                time({
                    stationId: 'f',
                    stopSequence: 3,
                    arrivalTime: '07:10:00',
                    departureTime: '07:10:00',
                }),
                time({
                    stationId: 'n',
                    stopSequence: 4,
                    arrivalTime: '07:25:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({ trip, ...branchCommonParams });

        expect(line?.segments).toEqual([
            [
                { minute: 180, y: 80 },
                { minute: 185, y: 70 },
                { minute: 190, y: 60 },
                { minute: 205, y: 50 },
            ],
        ]);
        expect(line?.connectors).toEqual([]);
    });

    it('本線の下り n→f→g: f で跳ぶ（connector 1、fromY 60、toY 90）', () => {
        const trip: TripDetailsDto = {
            tripId: 'trip-nfg',
            tripNumber: '4',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#8a8a8a' } as any,
            times: [
                time({
                    stationId: 'n',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'f',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                    departureTime: '07:10:00',
                }),
                time({
                    stationId: 'g',
                    stopSequence: 3,
                    arrivalTime: '07:30:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({ trip, ...branchCommonParams });

        expect(line?.segments).toEqual([
            [
                { minute: 180, y: 50 },
                { minute: 190, y: 60 },
            ],
            [
                { minute: 190, y: 90 },
                { minute: 210, y: 100 },
            ],
        ]);
        expect(line?.connectors).toEqual([{ minute: 190, fromY: 60, toY: 90 }]);
    });

    it('いずみ野線の下り n→f→i1: f は跳ばない（segment 1本・connector 0）', () => {
        const trip: TripDetailsDto = {
            tripId: 'trip-nfi1',
            tripNumber: '5',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#8a8a8a' } as any,
            times: [
                time({
                    stationId: 'n',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'f',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                    departureTime: '07:10:00',
                }),
                time({
                    stationId: 'i1',
                    stopSequence: 3,
                    arrivalTime: '07:20:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({ trip, ...branchCommonParams });

        expect(line?.segments).toEqual([
            [
                { minute: 180, y: 50 },
                { minute: 190, y: 60 },
                { minute: 200, y: 70 },
            ],
        ]);
        expect(line?.connectors).toEqual([]);
    });

    it('本線 y→k→g: k と g の間はどの行の組み合わせでもいずみ野線(i1・i2)を避けられず分断する（connector 0）', () => {
        const trip: TripDetailsDto = {
            tripId: 'trip-ykg',
            tripNumber: '6',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#8a8a8a' } as any,
            times: [
                time({
                    stationId: 'y',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'k',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                    departureTime: '07:10:00',
                }),
                time({
                    stationId: 'g',
                    stopSequence: 3,
                    arrivalTime: '08:00:00',
                    departureTime: '08:02:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({ trip, ...branchCommonParams });

        expect(line?.segments).toEqual([
            [
                { minute: 180, y: 20 },
                { minute: 190, y: 30 },
            ],
            [
                { minute: 240, y: 100 },
                { minute: 242, y: 100 },
            ],
        ]);
        expect(line?.connectors).toEqual([]);
    });
});

describe('buildTripDiagramLine: 合流点(西谷)を跨ぐ列車の経由判定はtrip自身のtimesで行う（コントローラ指摘のバグ修正）', () => {
    // 軸: 新横浜(0) 羽沢(10) 西谷*(20) 横浜(30) 上星川(40) 西谷(50) 鶴ヶ峰(60)
    // （西谷* は新横浜線側の複製 occurrence。実データの並びを模したもの）。
    const nishiyaAxisStationOrder = [
        'shin-yokohama',
        'hazawa',
        'nishiya',
        'yokohama',
        'kami-hoshikawa',
        'nishiya',
        'tsurugamine',
    ];
    const nishiyaAxis = toAxis([
        ['shin-yokohama', 0],
        ['hazawa', 10],
        ['nishiya', 20],
        ['yokohama', 30],
        ['kami-hoshikawa', 40],
        ['nishiya', 50],
        ['tsurugamine', 60],
    ]);
    const nishiyaCommonParams = {
        axis: nishiyaAxis,
        axisStationIds: new Set(nishiyaAxisStationOrder),
        base,
        stationNameById: new Map<string, string>(),
    };

    it('新横浜線→本線の直通列車（新横浜→羽沢→西谷→鶴ヶ峰）: 横浜・上星川の times が無くても西谷で跳ぶだけで、横浜・上星川を直線横断しない', () => {
        const trip: TripDetailsDto = {
            tripId: 'trip-shinyokohama-through',
            tripNumber: '101',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#8a8a8a' } as any,
            times: [
                time({
                    stationId: 'shin-yokohama',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'hazawa',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                    departureTime: '07:10:00',
                }),
                time({
                    stationId: 'nishiya',
                    stopSequence: 3,
                    arrivalTime: '07:20:00',
                    departureTime: '07:20:00',
                }),
                time({
                    stationId: 'tsurugamine',
                    stopSequence: 4,
                    arrivalTime: '07:40:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({ ...nishiyaCommonParams, trip });

        // 1本目: 新横浜→羽沢→西谷(第1 occurrence, y=20) で終わる
        // 2本目: 西谷(第2 occurrence, y=50)→鶴ヶ峰 で始まる
        // （横浜・上星川の y=30/40 をどちらの線分も横切らない）
        expect(line?.segments).toEqual([
            [
                { minute: 180, y: 0 },
                { minute: 190, y: 10 },
                { minute: 200, y: 20 },
            ],
            [
                { minute: 200, y: 50 },
                { minute: 220, y: 60 },
            ],
        ]);
        expect(line?.connectors).toEqual([{ minute: 200, fromY: 20, toY: 50 }]);
    });

    it('本線の優等列車（横浜→西谷、上星川は通過）: 上星川が通過駅として times にあれば、西谷は本線側の occurrence（第2）を選び 1 本の線で繋がる', () => {
        const trip: TripDetailsDto = {
            tripId: 'trip-main-express',
            tripNumber: '202',
            tripClassId: 'tc1',
            tripClass: { tripClassColor: '#8a8a8a' } as any,
            times: [
                time({
                    stationId: 'yokohama',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                // 上星川は通過（停車しない＝発着なしの行）。
                time({ stationId: 'kami-hoshikawa', stopSequence: 2 }),
                time({
                    stationId: 'nishiya',
                    stopSequence: 3,
                    arrivalTime: '07:20:00',
                }),
            ],
        } as TripDetailsDto;

        const line = buildTripDiagramLine({ ...nishiyaCommonParams, trip });

        // 西谷* (第1 occurrence, y=20) は分岐駅の複製であって本線の経路ではないため
        // 選ばれず、本線側の occurrence（y=50）へ 1 本の線で繋がる。跳びは発生しない。
        expect(line?.segments).toEqual([
            [
                { minute: 180, y: 30 },
                { minute: 200, y: 50 },
            ],
        ]);
        expect(line?.connectors).toEqual([]);
    });
});

describe('resolveArrival / resolveDeparture（toAbsoluteTime と同じ結果）', () => {
    it.each([
        [new Date(2026, 6, 20), 1, '07:05:30'],
        [new Date(2026, 6, 20), 2, '00:30:00'],
        [new Date(2026, 6, 31), 2, '01:25:00'],
        [new Date(2026, 11, 31), 2, '00:00:00'],
        [new Date(2026, 2, 8, 13, 45), 1, '23:59:59'],
    ])('%s の days=%i %s', (base, days, time) => {
        const expected = toAbsoluteTime(base, days - 1, time).getTime();
        const stop = {
            timeId: 'x',
            arrivalTime: time,
            arrivalDays: days,
            departureTime: time,
            departureDays: days,
        };
        expect(resolveArrival(base, stop)?.getTime()).toBe(expected);
        expect(resolveDeparture(base, stop)?.getTime()).toBe(expected);
    });
});
