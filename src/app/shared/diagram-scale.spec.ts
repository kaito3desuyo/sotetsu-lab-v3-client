import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { buildStationAxis, stationToY, timeToX } from './diagram-scale';

function makeStation(stationId: string, stationSequence: number): any {
    return { stationId, stationSequence };
}

function makeTime(
    stationId: string,
    arrivalTime: string | undefined,
    departureTime: string | undefined,
    days = 0,
): any {
    return {
        stationId,
        arrivalTime,
        arrivalDays: days,
        departureTime,
        departureDays: days,
    };
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

        const axis = buildStationAxis(stations, times);

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
        // representativeTripTimes が空 = どの駅間も導出不能
        const axis = buildStationAxis(stations, []);

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

        const axis = buildStationAxis(stations, times);

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

        const axis = buildStationAxis(stations, times);

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

        const axis = buildStationAxis(stations, times);

        expect(stationToY('st1', axis)).toBe(0);
        expect(stationToY('st2', axis)).toBe(5);
        expect(stationToY('st3', axis)).toBe(15);
    });

    it('駅軸に存在しない stationId を指定すると例外を投げる', () => {
        const axis = buildStationAxis([makeStation('st1', 1)], []);
        expect(() => stationToY('unknown', axis)).toThrow();
    });
});
