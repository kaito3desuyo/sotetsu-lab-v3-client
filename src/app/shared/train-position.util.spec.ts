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

    it('同じ運用のまとまりで列番・種別が変わる駅では、次の列番で発つまで前の列車を停車中として残す', () => {
        // 例: 各停 T1 が B に着き、同じ編成が快速 T2 として B を発つ（種別変更）
        const tripBlocks = [
            tripBlock([
                trip('T1', [
                    time({ stationId: 'A', stopSequence: 1, departureTime: '08:00:00' }),
                    time({ stationId: 'B', stopSequence: 2, arrivalTime: '08:10:00' }),
                ]),
                trip('T2', [
                    time({ stationId: 'B', stopSequence: 1, departureTime: '08:14:00' }),
                    time({ stationId: 'C', stopSequence: 2, arrivalTime: '08:20:00' }),
                ]),
            ]),
        ];

        expect(estimatePositions(tripBlocks, AXIS_ABC, new Date(2026, 6, 4, 8, 12, 0))).toEqual([
            { type: 'stopped', tripId: 'T1', stationId: 'B' },
        ]);
        expect(estimatePositions(tripBlocks, AXIS_ABC, new Date(2026, 6, 4, 8, 14, 0))).toEqual([
            { type: 'between', tripId: 'T2', fromStationId: 'B', toStationId: 'C', progress: 0 },
        ]);
    });

    describe('折り返し（同じ運用が終点に着き、逆向きの別のまとまりで発つ）', () => {
        function operatedTrip(
            tripId: string,
            operationId: string,
            times: TimeDetailsDto[],
            overrides: Partial<TripDetailsDto> = {},
        ): TripDetailsDto {
            return {
                tripId,
                times,
                tripOperationLists: [{ operationId }],
                ...overrides,
            } as TripDetailsDto;
        }

        // 例: 上り T1 が C（横浜）に着き、同じ運用が下り T2 として C を発つ
        function turnaroundBlocks(
            nextOperationId = 'O1',
            previousOverrides: Partial<TripDetailsDto> = {},
            nextOverrides: Partial<TripDetailsDto> = {},
        ): TripBlockDetailsDto[] {
            return [
                tripBlock([
                    operatedTrip(
                        'T1',
                        'O1',
                        [
                            time({ stationId: 'A', stopSequence: 1, departureTime: '08:00:00' }),
                            time({ stationId: 'C', stopSequence: 2, arrivalTime: '08:10:00' }),
                        ],
                        previousOverrides,
                    ),
                ]),
                tripBlock([
                    operatedTrip(
                        'T2',
                        nextOperationId,
                        [
                            time({ stationId: 'C', stopSequence: 1, departureTime: '08:18:00' }),
                            time({ stationId: 'A', stopSequence: 2, arrivalTime: '08:28:00' }),
                        ],
                        nextOverrides,
                    ),
                ]),
            ];
        }

        it('前の列車が着いてから発時刻までは、これから発つ列車を折返しとして出す', () => {
            expect(
                estimatePositions(turnaroundBlocks(), AXIS_ABC, new Date(2026, 6, 4, 8, 10, 0)),
            ).toEqual([{ type: 'stopped', tripId: 'T2', stationId: 'C', stoppedReason: 'turnaround' }]);
            expect(
                estimatePositions(turnaroundBlocks(), AXIS_ABC, new Date(2026, 6, 4, 8, 17, 59)),
            ).toEqual([{ type: 'stopped', tripId: 'T2', stationId: 'C', stoppedReason: 'turnaround' }]);
            expect(
                estimatePositions(turnaroundBlocks(), AXIS_ABC, new Date(2026, 6, 4, 8, 18, 0)),
            ).toEqual([
                { type: 'between', tripId: 'T2', fromStationId: 'C', toStationId: 'A', progress: 0 },
            ]);
        });

        it('前の列車が着く前は出さない', () => {
            expect(
                estimatePositions(turnaroundBlocks(), AXIS_ABC, new Date(2026, 6, 4, 8, 9, 59)),
            ).toEqual([
                expect.objectContaining({ type: 'between', tripId: 'T1' }),
            ]);
        });

        it('運用が違えば出さない', () => {
            expect(
                estimatePositions(turnaroundBlocks('O2'), AXIS_ABC, new Date(2026, 6, 4, 8, 12, 0)),
            ).toEqual([]);
        });

        it('前の列車が入庫するなら、発つ列車は折返しとして出さない（着後 3 分は前の列車が入庫中）', () => {
            expect(
                estimatePositions(
                    turnaroundBlocks('O1', { depotIn: true }),
                    AXIS_ABC,
                    new Date(2026, 6, 4, 8, 12, 0),
                ),
            ).toEqual([{ type: 'stopped', tripId: 'T1', stationId: 'C', stoppedReason: 'depotIn' }]);
            expect(
                estimatePositions(
                    turnaroundBlocks('O1', { depotIn: true }),
                    AXIS_ABC,
                    new Date(2026, 6, 4, 8, 14, 0),
                ),
            ).toEqual([]);
        });

        it('発つ列車が出庫なら、前の列車が着いても出さない', () => {
            expect(
                estimatePositions(
                    turnaroundBlocks('O1', {}, { depotOut: true }),
                    AXIS_ABC,
                    new Date(2026, 6, 4, 8, 12, 0),
                ),
            ).toEqual([]);
        });
    });

    it('出庫する列車は、発時刻の 3 分前から始発駅に出庫中として出す', () => {
        const tripBlocks = [
            tripBlock([
                {
                    ...trip('T1', [
                        time({ stationId: 'A', stopSequence: 1, departureTime: '08:00:00' }),
                        time({ stationId: 'C', stopSequence: 2, arrivalTime: '08:10:00' }),
                    ]),
                    depotOut: true,
                },
            ]),
        ];

        expect(estimatePositions(tripBlocks, AXIS_ABC, new Date(2026, 6, 4, 7, 56, 59))).toEqual([]);
        expect(estimatePositions(tripBlocks, AXIS_ABC, new Date(2026, 6, 4, 7, 57, 0))).toEqual([
            { type: 'stopped', tripId: 'T1', stationId: 'A', stoppedReason: 'depotOut' },
        ]);
        expect(estimatePositions(tripBlocks, AXIS_ABC, new Date(2026, 6, 4, 7, 59, 59))).toEqual([
            { type: 'stopped', tripId: 'T1', stationId: 'A', stoppedReason: 'depotOut' },
        ]);
        expect(estimatePositions(tripBlocks, AXIS_ABC, new Date(2026, 6, 4, 8, 0, 0))).toEqual([
            { type: 'between', tripId: 'T1', fromStationId: 'A', toStationId: 'C', progress: 0 },
        ]);
    });

    it('入庫する列車は、終点に着いてから 3 分間、入庫中として出す', () => {
        const tripBlocks = [
            tripBlock([
                {
                    ...trip('T1', [
                        time({ stationId: 'A', stopSequence: 1, departureTime: '08:00:00' }),
                        time({ stationId: 'C', stopSequence: 2, arrivalTime: '08:10:00' }),
                    ]),
                    depotIn: true,
                },
            ]),
        ];

        expect(estimatePositions(tripBlocks, AXIS_ABC, new Date(2026, 6, 4, 8, 10, 0))).toEqual([
            { type: 'stopped', tripId: 'T1', stationId: 'C', stoppedReason: 'depotIn' },
        ]);
        expect(estimatePositions(tripBlocks, AXIS_ABC, new Date(2026, 6, 4, 8, 12, 59))).toEqual([
            { type: 'stopped', tripId: 'T1', stationId: 'C', stoppedReason: 'depotIn' },
        ]);
        expect(estimatePositions(tripBlocks, AXIS_ABC, new Date(2026, 6, 4, 8, 13, 0))).toEqual([]);
    });

    it('出庫しない列車は、発時刻の前には出さない', () => {
        const tripBlocks = [
            tripBlock([
                trip('T1', [
                    time({ stationId: 'A', stopSequence: 1, departureTime: '08:00:00' }),
                    time({ stationId: 'C', stopSequence: 2, arrivalTime: '08:10:00' }),
                ]),
            ]),
        ];

        expect(estimatePositions(tripBlocks, AXIS_ABC, new Date(2026, 6, 4, 7, 58, 0))).toEqual([]);
    });

    it('駅軸の最後の停車駅から他線へ直通する列車は、そこを発つまで停車中として残す', () => {
        // 例: 本線の二俣川に着き、いずみ野線（駅軸外の D）へ直通する列車
        const axisAB = [station('A'), station('B')];
        const tripBlocks = [
            tripBlock([
                trip('T1', [
                    time({ stationId: 'A', stopSequence: 1, departureTime: '08:00:00' }),
                    time({ stationId: 'B', stopSequence: 2, arrivalTime: '08:10:00', departureTime: '08:12:00' }),
                    time({ stationId: 'D', stopSequence: 3, arrivalTime: '08:20:00' }),
                ]),
            ]),
        ];

        expect(estimatePositions(tripBlocks, axisAB, new Date(2026, 6, 4, 8, 11, 0))).toEqual([
            { type: 'stopped', tripId: 'T1', stationId: 'B' },
        ]);
        // 発ったあとは他線に入るので図から消える
        expect(estimatePositions(tripBlocks, axisAB, new Date(2026, 6, 4, 8, 12, 0))).toEqual([]);
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
