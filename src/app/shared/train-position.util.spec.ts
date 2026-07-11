import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { estimatePositions } from './train-position.util';

function station(stationId: string): RouteStationDto {
    return { stationId } as RouteStationDto;
}

function time(overrides: Partial<TimeDetailsDto>): TimeDetailsDto {
    return overrides as TimeDetailsDto;
}

function trip(tripId: string, times: TimeDetailsDto[]): TripDetailsDto {
    return { tripId, times } as TripDetailsDto;
}

function tripBlock(trips: TripDetailsDto[]): TripBlockDetailsDto {
    return { tripBlockId: `tb-${trips[0]?.tripId ?? 'x'}`, trips } as TripBlockDetailsDto;
}

const AXIS_ABC = [station('A'), station('B'), station('C')];

describe('estimatePositions', () => {
    it('発時刻ちょうどは駅間（progress=0）と判定する（境界値）', () => {
        const at = new Date(2026, 6, 4, 8, 0, 0);
        const tripBlocks = [
            tripBlock([
                trip('T1', [
                    time({ stationId: 'A', stopSequence: 1, departureTime: '08:00:00' }),
                    time({ stationId: 'B', stopSequence: 2, arrivalTime: '08:10:00' }),
                ]),
            ]),
        ];

        const result = estimatePositions(tripBlocks, AXIS_ABC, at);

        expect(result).toEqual([
            { type: 'between', tripId: 'T1', fromStationId: 'A', toStationId: 'B', progress: 0 },
        ]);
    });

    it('着時刻ちょうどは停車中と判定する（境界値）', () => {
        const at = new Date(2026, 6, 4, 8, 10, 0);
        const tripBlocks = [
            tripBlock([
                trip('T1', [
                    time({ stationId: 'A', stopSequence: 1, departureTime: '08:00:00' }),
                    time({
                        stationId: 'B',
                        stopSequence: 2,
                        arrivalTime: '08:10:00',
                        departureTime: '08:12:00',
                    }),
                    time({ stationId: 'C', stopSequence: 3, arrivalTime: '08:20:00' }),
                ]),
            ]),
        ];

        const result = estimatePositions(tripBlocks, AXIS_ABC, at);

        expect(result).toEqual([{ type: 'stopped', tripId: 'T1', stationId: 'B' }]);
    });

    it('0 秒停車（着=発）は stopped にならず次区間の between(progress=0) に吸収される', () => {
        const at = new Date(2026, 6, 4, 8, 10, 0);
        const tripBlocks = [
            tripBlock([
                trip('T1', [
                    time({ stationId: 'A', stopSequence: 1, departureTime: '08:00:00' }),
                    time({
                        stationId: 'B',
                        stopSequence: 2,
                        arrivalTime: '08:10:00',
                        departureTime: '08:10:00',
                    }),
                    time({ stationId: 'C', stopSequence: 3, arrivalTime: '08:20:00' }),
                ]),
            ]),
        ];

        const result = estimatePositions(tripBlocks, AXIS_ABC, at);

        expect(result).toEqual([
            { type: 'between', tripId: 'T1', fromStationId: 'B', toStationId: 'C', progress: 0 },
        ]);
    });

    it('24 時超え（days は 1-based。当日=1 / 翌日分=2）を跨いだ駅間を正しく補間する', () => {
        // 2026-07-04 23:50 発（営業日当日=day 1）→ 2026-07-05 00:10（=24:10・翌日分=day 2）着 を 23:55 時点で見る
        const at = new Date(2026, 6, 4, 23, 55, 0);
        const tripBlocks = [
            tripBlock([
                trip('T1', [
                    time({
                        stationId: 'A',
                        stopSequence: 1,
                        departureDays: 1,
                        departureTime: '23:50:00',
                    }),
                    time({
                        stationId: 'B',
                        stopSequence: 2,
                        arrivalDays: 2,
                        arrivalTime: '00:10:00',
                    }),
                ]),
            ]),
        ];

        const result = estimatePositions(tripBlocks, AXIS_ABC, at);

        // 23:50 -> 24:10（20分）のうち 23:50 -> 23:55（5分）経過 = progress 0.25
        expect(result).toEqual([
            { type: 'between', tripId: 'T1', fromStationId: 'A', toStationId: 'B', progress: 0.25 },
        ]);
    });

    it('4 時境界: 深夜 0:30 は前日ダイヤの 24:30 として算出される', () => {
        // wall-clock は 2026-07-05 00:30。鉄道日的には前日(2026-07-04)の営業日が継続中で、
        // 当該 trip の時刻は翌日分(day 2) '00:20:00'(=24:20) / '00:40:00'(=24:40) として記録されている。
        const at = new Date(2026, 6, 5, 0, 30, 0);
        const tripBlocks = [
            tripBlock([
                trip('T1', [
                    time({
                        stationId: 'A',
                        stopSequence: 1,
                        departureDays: 2,
                        departureTime: '00:20:00',
                    }),
                    time({
                        stationId: 'B',
                        stopSequence: 2,
                        arrivalDays: 2,
                        arrivalTime: '00:40:00',
                    }),
                ]),
            ]),
        ];

        const result = estimatePositions(tripBlocks, AXIS_ABC, at);

        expect(result).toEqual([
            { type: 'between', tripId: 'T1', fromStationId: 'A', toStationId: 'B', progress: 0.5 },
        ]);
    });

    it('通過駅（駅軸に存在しない駅）を挟む区間は前後の停車駅で内分する', () => {
        const at = new Date(2026, 6, 4, 8, 10, 0);
        const axisWithoutB = [station('A'), station('C')];
        const tripBlocks = [
            tripBlock([
                trip('T1', [
                    time({ stationId: 'A', stopSequence: 1, departureTime: '08:00:00' }),
                    time({
                        stationId: 'B',
                        stopSequence: 2,
                        arrivalTime: '08:05:00',
                        departureTime: '08:05:00',
                    }),
                    time({ stationId: 'C', stopSequence: 3, arrivalTime: '08:20:00' }),
                ]),
            ]),
        ];

        const result = estimatePositions(tripBlocks, axisWithoutB, at);

        // A(08:00) -> C(08:20) の 20 分のうち 10 分経過 = progress 0.5（B は駅軸に無いため無視される）
        expect(result).toEqual([
            { type: 'between', tripId: 'T1', fromStationId: 'A', toStationId: 'C', progress: 0.5 },
        ]);
    });

    it('通過駅（発着時刻が両方欠落）を挟む区間も前後の停車駅で内分する', () => {
        const at = new Date(2026, 6, 4, 8, 10, 0);
        const tripBlocks = [
            tripBlock([
                trip('T1', [
                    time({ stationId: 'A', stopSequence: 1, departureTime: '08:00:00' }),
                    time({ stationId: 'B', stopSequence: 2 }), // 通過駅: 発着時刻なし
                    time({ stationId: 'C', stopSequence: 3, arrivalTime: '08:20:00' }),
                ]),
            ]),
        ];

        const result = estimatePositions(tripBlocks, AXIS_ABC, at);

        expect(result).toEqual([
            { type: 'between', tripId: 'T1', fromStationId: 'A', toStationId: 'C', progress: 0.5 },
        ]);
    });

    it('未出発（at < 最初の発時刻）は結果に含めない（境界値: 発時刻の1秒前）', () => {
        const at = new Date(2026, 6, 4, 7, 59, 59);
        const tripBlocks = [
            tripBlock([
                trip('T1', [
                    time({ stationId: 'A', stopSequence: 1, departureTime: '08:00:00' }),
                    time({ stationId: 'B', stopSequence: 2, arrivalTime: '08:10:00' }),
                ]),
            ]),
        ];

        expect(estimatePositions(tripBlocks, AXIS_ABC, at)).toEqual([]);
    });

    it('到着済（最後の着時刻 ≤ at）は結果に含めない（境界値: 着時刻ちょうど）', () => {
        const at = new Date(2026, 6, 4, 8, 10, 0);
        const tripBlocks = [
            tripBlock([
                trip('T1', [
                    time({ stationId: 'A', stopSequence: 1, departureTime: '08:00:00' }),
                    time({ stationId: 'B', stopSequence: 2, arrivalTime: '08:10:00' }),
                ]),
            ]),
        ];

        expect(estimatePositions(tripBlocks, AXIS_ABC, at)).toEqual([]);
    });

    it('複数 tripBlock・複数 trip を横断し、該当するものだけを結果にまとめる', () => {
        const at = new Date(2026, 6, 4, 8, 5, 0);
        const tripBlocks = [
            tripBlock([
                trip('T1', [
                    time({ stationId: 'A', stopSequence: 1, departureTime: '08:00:00' }),
                    time({ stationId: 'B', stopSequence: 2, arrivalTime: '08:10:00' }),
                ]),
            ]),
            tripBlock([
                trip('T2', [
                    // 未出発（10時発）
                    time({ stationId: 'A', stopSequence: 1, departureTime: '10:00:00' }),
                    time({ stationId: 'B', stopSequence: 2, arrivalTime: '10:10:00' }),
                ]),
                trip('T3', [
                    time({
                        stationId: 'B',
                        stopSequence: 1,
                        arrivalTime: '08:00:00',
                        departureTime: '08:07:00',
                    }),
                    time({ stationId: 'C', stopSequence: 2, arrivalTime: '08:20:00' }),
                ]),
            ]),
        ];

        const result = estimatePositions(tripBlocks, AXIS_ABC, at);

        expect(result).toEqual([
            { type: 'between', tripId: 'T1', fromStationId: 'A', toStationId: 'B', progress: 0.5 },
            { type: 'stopped', tripId: 'T3', stationId: 'B' },
        ]);
    });

    it('駅軸に存在する停車点が1点以下の trip は結果に含めない', () => {
        const at = new Date(2026, 6, 4, 8, 5, 0);
        const tripBlocks = [
            tripBlock([
                trip('T1', [
                    time({ stationId: 'A', stopSequence: 1, departureTime: '08:00:00' }),
                ]),
            ]),
        ];

        expect(estimatePositions(tripBlocks, AXIS_ABC, at)).toEqual([]);
    });

    it('発着とも null の通過駅を含んでもクラッシュせず、前後駅間の補間に吸収される（実データ回帰）', () => {
        const at = new Date(2026, 6, 4, 8, 10, 0);
        const tripBlocks = [
            tripBlock([
                trip('T1', [
                    time({ stationId: 'A', stopSequence: 1, departureTime: '08:00:00' }),
                    // 通過駅 B: API は欠落時刻を null で返す（DTO型は string? だが実体は null）
                    time({
                        stationId: 'B',
                        stopSequence: 2,
                        arrivalTime: null as unknown as string,
                        departureTime: null as unknown as string,
                    }),
                    time({ stationId: 'C', stopSequence: 3, arrivalTime: '08:20:00' }),
                ]),
            ]),
        ];

        // B は除外され A→C 区間で内分（08:10 は A発08:00〜C着08:20 の中点 = 0.5）
        expect(estimatePositions(tripBlocks, AXIS_ABC, at)).toEqual([
            { type: 'between', tripId: 'T1', fromStationId: 'A', toStationId: 'C', progress: 0.5 },
        ]);
    });
});
