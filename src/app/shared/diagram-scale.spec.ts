import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import {
    buildSegmentMinutesMap,
    buildStationAxis,
    enforceMinimumRowGap,
    stationToY,
    timeToX,
} from './diagram-scale';

function makeStation(stationId: string, stationSequence: number): any {
    return { stationId, stationSequence };
}

function makeTime(
    stationId: string,
    arrivalTime: string | undefined,
    departureTime: string | undefined,
    days = 0,
): any {
    // stopSequence は省略（全て undefined → 安定ソートで作成順を軸順とする）。
    return {
        stationId,
        arrivalTime,
        arrivalDays: days,
        departureTime,
        departureDays: days,
    };
}

/** 単一 trip の times から軸を作るヘルパ（buildSegmentMinutesMap 経由）。 */
function axisFromTrip(
    stations: readonly RouteStationDto[],
    times: readonly TimeDetailsDto[],
) {
    return buildStationAxis(stations, buildSegmentMinutesMap([times]));
}

describe('timeToX', () => {
    it('線形である（同じ pxPerMinute では時間に比例して x が増える）', () => {
        expect(timeToX(0, 2)).toBe(0);
        expect(timeToX(10, 2)).toBe(20);
        expect(timeToX(20, 2)).toBe(40);
        expect(timeToX(20, 2)).toBe(2 * timeToX(10, 2));
    });

    it('pxPerMinute にも比例する', () => {
        expect(timeToX(10, 1)).toBe(10);
        expect(timeToX(10, 3)).toBe(30);
    });
});

describe('buildStationAxis / stationToY', () => {
    it('所要時間比で比例配分する（区間の所要時間差に応じて間隔が変わる）', () => {
        const stations: RouteStationDto[] = [
            makeStation('st1', 1),
            makeStation('st2', 2),
            makeStation('st3', 3),
        ];
        const times: TimeDetailsDto[] = [
            makeTime('st1', undefined, '10:00:00'), // 始発
            makeTime('st2', '10:05:00', '10:05:00'), // st1->st2: 5分
            makeTime('st3', '10:15:00', undefined), // st2->st3: 10分（終着）
        ];

        const axis = axisFromTrip(stations, times);

        expect(stationToY('st1', axis)).toBe(0);
        expect(stationToY('st2', axis)).toBe(5);
        expect(stationToY('st3', axis)).toBe(15);
        // 所要時間差(5分 vs 10分)がそのまま間隔比(1:2)に反映される
        const seg1 = stationToY('st2', axis) - stationToY('st1', axis);
        const seg2 = stationToY('st3', axis) - stationToY('st2', axis);
        expect(seg2).toBe(seg1 * 2);
    });

    it('全区間の所要時間が導出できない場合は等間隔フォールバックになる', () => {
        const stations: RouteStationDto[] = [
            makeStation('st1', 1),
            makeStation('st2', 2),
            makeStation('st3', 3),
            makeStation('st4', 4),
        ];
        // tripsTimes が空 = どの駅間も導出不能
        const axis = buildStationAxis(stations, new Map());

        expect(stationToY('st1', axis)).toBe(0);
        expect(stationToY('st2', axis)).toBe(1);
        expect(stationToY('st3', axis)).toBe(2);
        expect(stationToY('st4', axis)).toBe(3);
    });

    it('一部の駅間のみ所要時間が導出できない場合、その区間は導出済み区間の平均で埋める', () => {
        const stations: RouteStationDto[] = [
            makeStation('st1', 1),
            makeStation('st2', 2),
            makeStation('st3', 3),
            makeStation('st4', 4), // st3->st4 の times が存在せず導出不能
        ];
        const times: TimeDetailsDto[] = [
            makeTime('st1', undefined, '10:00:00'),
            makeTime('st2', '10:04:00', '10:04:00'), // st1->st2: 4分
            makeTime('st3', '10:12:00', '10:12:00'), // st2->st3: 8分
            // st4 の times なし → st3->st4 はフォールバック対象
        ];

        const axis = axisFromTrip(stations, times);

        expect(stationToY('st1', axis)).toBe(0);
        expect(stationToY('st2', axis)).toBe(4);
        expect(stationToY('st3', axis)).toBe(12);
        // フォールバック値は導出済み区間(4分・8分)の平均である6分
        expect(stationToY('st4', axis)).toBe(18);
    });

    it('日をまたぐ times（arrivalDays/departureDays）でも所要時間を正しく導出する', () => {
        const stations: RouteStationDto[] = [
            makeStation('st1', 1),
            makeStation('st2', 2),
        ];
        const times: TimeDetailsDto[] = [
            makeTime('st1', undefined, '23:58:00', 0),
            makeTime('st2', '00:03:00', undefined, 1), // 翌日0:03着 = 5分後
        ];

        const axis = axisFromTrip(stations, times);

        expect(stationToY('st1', axis)).toBe(0);
        expect(stationToY('st2', axis)).toBe(5);
    });

    it('stationSequence 順ではない入力でも正しく並べ替えて処理する', () => {
        const stations: RouteStationDto[] = [
            makeStation('st3', 3),
            makeStation('st1', 1),
            makeStation('st2', 2),
        ];
        const times: TimeDetailsDto[] = [
            makeTime('st1', undefined, '10:00:00'),
            makeTime('st2', '10:05:00', '10:05:00'),
            makeTime('st3', '10:15:00', undefined),
        ];

        const axis = axisFromTrip(stations, times);

        expect(stationToY('st1', axis)).toBe(0);
        expect(stationToY('st2', axis)).toBe(5);
        expect(stationToY('st3', axis)).toBe(15);
    });

    it('駅軸に存在しない stationId を指定すると例外を投げる', () => {
        const axis = buildStationAxis([makeStation('st1', 1)], new Map());
        expect(() => stationToY('unknown', axis)).toThrow();
    });

    it('routesOrderedStationIds を渡すと、base で隣接しない路線内ペアの接続駅を複製挿入する', () => {
        // base（網羅駅軸）: yokohama, futamatagawa, izumino1, izumino2, hoshigaoka
        // 本線の順序付き駅列は futamatagawa の次に hoshigaoka が来るが、
        // base 上では間に izumino1/izumino2 が挟まるため隣接しない
        // → hoshigaoka の直前に futamatagawa の複製が挿入されるはず。
        const stations: RouteStationDto[] = [
            makeStation('yokohama', 1),
            makeStation('futamatagawa', 2),
            makeStation('izumino1', 3),
            makeStation('izumino2', 4),
            makeStation('hoshigaoka', 5),
        ];
        const mainRoute = [
            'yokohama',
            'futamatagawa',
            'hoshigaoka',
        ];
        const izuminoRoute = [
            'futamatagawa',
            'izumino1',
            'izumino2',
        ];

        const axis = buildStationAxis(stations, new Map(), [
            mainRoute,
            izuminoRoute,
        ]);

        expect(axis.map((e) => e.stationId)).toEqual([
            'yokohama',
            'futamatagawa',
            'izumino1',
            'izumino2',
            'futamatagawa',
            'hoshigaoka',
        ]);
        // 複製された futamatagawa（末尾から2番目）は hoshigaoka の直前に y を持つ
        expect(axis[4].y).toBeLessThan(axis[5].y);
        // 元の並び順（yokohama→futamatagawa→izumino1→izumino2→hoshigaoka）は維持される
        expect(axis[0].y).toBeLessThan(axis[1].y);
        expect(axis[1].y).toBeLessThan(axis[2].y);
        expect(axis[2].y).toBeLessThan(axis[3].y);
    });

    it('軸が路線順の逆向き（軸 [C,B,A]・路線順 [A,B,C]）でも複製は発生しない（隣接判定は方向非依存）', () => {
        // networkStations のキュレート順が route_station_lists の並びと逆方向の路線
        // （川越線・三田線等）を想定。逆隣接ペアを非隣接と誤判定すると全駅が交互二重化する。
        const stations: RouteStationDto[] = [
            makeStation('stC', 1),
            makeStation('stB', 2),
            makeStation('stA', 3),
        ];
        const reversedRoute = ['stA', 'stB', 'stC'];

        const axis = buildStationAxis(stations, new Map(), [reversedRoute]);

        expect(axis.map((e) => e.stationId)).toEqual(['stC', 'stB', 'stA']);
    });

    it('降順路線でも複製の連鎖（ドミノ）が起きない: base=[K,L,M,N,X,Z]・route=[Z,N,M,L,K] → N が Z の直前に複製されるだけ', () => {
        // route-station-list.state の desc ソート路線（埼京線・川越線等）を想定。
        // 向き正規化がないと、(Z,N) の複製挿入が (N,M) の逆隣接を分断し、
        // 以降 (M,L)→(L,K) と挿入が連鎖して路線全体が交互二重化する。
        const stations: RouteStationDto[] = [
            makeStation('stK', 1),
            makeStation('stL', 2),
            makeStation('stM', 3),
            makeStation('stN', 4),
            makeStation('stX', 5), // 他路線の駅（K..N と Z の間に挟まる）
            makeStation('stZ', 6),
        ];
        const descRoute = ['stZ', 'stN', 'stM', 'stL', 'stK'];

        const axis = buildStationAxis(stations, new Map(), [descRoute]);

        expect(axis.map((e) => e.stationId)).toEqual([
            'stK',
            'stL',
            'stM',
            'stN',
            'stX',
            'stN',
            'stZ',
        ]);
    });

    it('順方向 route=[K,L,M,N,Z] でも降順と同一結果になる（向きに対して対称）', () => {
        const stations: RouteStationDto[] = [
            makeStation('stK', 1),
            makeStation('stL', 2),
            makeStation('stM', 3),
            makeStation('stN', 4),
            makeStation('stX', 5),
            makeStation('stZ', 6),
        ];
        const ascRoute = ['stK', 'stL', 'stM', 'stN', 'stZ'];

        const axis = buildStationAxis(stations, new Map(), [ascRoute]);

        expect(axis.map((e) => e.stationId)).toEqual([
            'stK',
            'stL',
            'stM',
            'stN',
            'stX',
            'stN',
            'stZ',
        ]);
    });

    it('真の分岐ペア（軸 [X, A, m1, m2, B]・路線順 […A,B…]）では従来どおり A が B の直前に複製される', () => {
        const stations: RouteStationDto[] = [
            makeStation('stX', 1),
            makeStation('stA', 2),
            makeStation('m1', 3),
            makeStation('m2', 4),
            makeStation('stB', 5),
        ];
        const route = ['stX', 'stA', 'stB'];

        const axis = buildStationAxis(stations, new Map(), [route]);

        expect(axis.map((e) => e.stationId)).toEqual([
            'stX',
            'stA',
            'm1',
            'm2',
            'stA',
            'stB',
        ]);
    });

    it('接続駅の複製で生じる継ぎ目区間は、平均ではなく実測区間の最小値でフォールバックする（G7: 不自然な空白帯の解消）', () => {
        // 本線 futamatagawa->hoshigaoka の実測は無し（フォールバック対象）。
        // 既知区間は 1分（短距離）と 20分（優等の長距離通過）。
        // 平均（10.5分）だと継ぎ目が不自然に間延びするため、最小値（1分）を使う。
        const stations: RouteStationDto[] = [
            makeStation('yokohama', 1),
            makeStation('futamatagawa', 2),
            makeStation('izumino1', 3),
            makeStation('hoshigaoka', 4),
        ];
        const mainRoute = ['yokohama', 'futamatagawa', 'hoshigaoka'];
        const izuminoRoute = ['futamatagawa', 'izumino1'];

        const segmentMinutes = new Map<string, number>([
            ['yokohama futamatagawa', 1],
            ['futamatagawa izumino1', 20],
        ]);

        const axis = buildStationAxis(stations, segmentMinutes, [
            mainRoute,
            izuminoRoute,
        ]);

        expect(axis.map((e) => e.stationId)).toEqual([
            'yokohama',
            'futamatagawa',
            'izumino1',
            'futamatagawa',
            'hoshigaoka',
        ]);
        // 継ぎ目区間（izumino1 -> futamatagawa(複製)）は最小値 1分でフォールバックする
        const junctionY = axis[3].y;
        const izuminoY = axis[2].y;
        expect(junctionY - izuminoY).toBe(1);
    });
});

describe('enforceMinimumRowGap', () => {
    it('最小間隔未満の区間のみ底上げする（広い区間はそのまま）', () => {
        const entries = [
            { stationId: 'st1', y: 0 },
            { stationId: 'st2', y: 2 }, // 狭すぎる（2px）
            { stationId: 'st3', y: 100 }, // 十分広い
        ];

        const result = enforceMinimumRowGap(entries, 20);

        expect(result.map((e) => e.y)).toEqual([0, 20, 100]);
    });

    it('連続して狭い区間が続く場合も累積して底上げする', () => {
        const entries = [
            { stationId: 'st1', y: 0 },
            { stationId: 'st2', y: 1 },
            { stationId: 'st3', y: 2 },
            { stationId: 'st4', y: 3 },
        ];

        const result = enforceMinimumRowGap(entries, 10);

        expect(result.map((e) => e.y)).toEqual([0, 10, 20, 30]);
    });

    it('全区間が最小間隔以上ならそのまま返す', () => {
        const entries = [
            { stationId: 'st1', y: 0 },
            { stationId: 'st2', y: 30 },
            { stationId: 'st3', y: 60 },
        ];

        const result = enforceMinimumRowGap(entries, 10);

        expect(result.map((e) => e.y)).toEqual([0, 30, 60]);
    });
});
