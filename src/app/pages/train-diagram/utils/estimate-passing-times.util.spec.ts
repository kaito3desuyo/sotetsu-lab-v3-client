import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import {
    buildStandardRunMinutes,
    estimatePassingStops,
} from './estimate-passing-times.util';

const base = new Date(2026, 6, 20, 0, 0, 0, 0);

function time(params: {
    stationId: string;
    stopSequence: number;
    arrivalTime?: string;
    departureTime?: string;
    days?: number;
}): TimeDetailsDto {
    return {
        timeId: `${params.stationId}-${params.stopSequence}`,
        stationId: params.stationId,
        stopSequence: params.stopSequence,
        arrivalTime: params.arrivalTime,
        departureTime: params.departureTime,
        arrivalDays: params.days ?? 1,
        departureDays: params.days ?? 1,
    } as TimeDetailsDto;
}

describe('buildStandardRunMinutes', () => {
    it('連続する 2 行の両方に時刻がある区間だけ、発→着の分の中央値を向き別に取る', () => {
        const trips = [
            {
                times: [
                    time({
                        stationId: 'A',
                        stopSequence: 1,
                        departureTime: '07:00:00',
                    }),
                    time({
                        stationId: 'B',
                        stopSequence: 2,
                        arrivalTime: '07:02:00',
                        departureTime: '07:03:00',
                    }),
                    time({ stationId: 'C', stopSequence: 3 }),
                    time({
                        stationId: 'D',
                        stopSequence: 4,
                        arrivalTime: '07:10:00',
                    }),
                ],
            },
            {
                times: [
                    time({
                        stationId: 'A',
                        stopSequence: 1,
                        departureTime: '08:00:00',
                    }),
                    time({
                        stationId: 'B',
                        stopSequence: 2,
                        arrivalTime: '08:03:00',
                    }),
                ],
            },
            {
                times: [
                    time({
                        stationId: 'A',
                        stopSequence: 1,
                        departureTime: '09:00:00',
                    }),
                    time({
                        stationId: 'B',
                        stopSequence: 2,
                        arrivalTime: '09:04:00',
                    }),
                ],
            },
        ] as TripDetailsDto[];

        const result = buildStandardRunMinutes(trips);

        expect(result.get('A>B')).toBe(3);
        expect(result.has('B>C')).toBe(false);
        expect(result.has('C>D')).toBe(false);
        expect(result.has('B>A')).toBe(false);
    });
});

describe('estimatePassingStops', () => {
    it('標準時間の比率で割り振り、逆向きの標準時間も使う。着・発は同じ時刻', () => {
        const [t, n] = estimatePassingStops({
            from: time({
                stationId: 'F',
                stopSequence: 1,
                departureTime: '07:00:00',
            }),
            to: time({
                stationId: 'H',
                stopSequence: 4,
                arrivalTime: '07:06:00',
            }),
            between: [
                time({ stationId: 'T', stopSequence: 2 }),
                time({ stationId: 'N', stopSequence: 3 }),
            ],
            standardRunMinutes: new Map([
                ['F>T', 3],
                ['N>T', 1],
                ['N>H', 2],
            ]),
            base,
        });

        expect(t.arrivalTime).toBe('07:03:00');
        expect(t.departureTime).toBe('07:03:00');
        expect(n.arrivalTime).toBe('07:04:00');
        expect(n.stopSequence).toBe(3);
    });

    it('標準時間が 1 つも無ければ均等に割り、日をまたぐと days を進める', () => {
        const [x, y] = estimatePassingStops({
            from: time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '23:58:00',
            }),
            to: time({
                stationId: 'D',
                stopSequence: 4,
                arrivalTime: '00:04:00',
                days: 2,
            }),
            between: [
                time({ stationId: 'B', stopSequence: 2 }),
                time({ stationId: 'C', stopSequence: 3 }),
            ],
            standardRunMinutes: new Map(),
            base,
        });

        expect(x.arrivalTime).toBe('00:00:00');
        expect(x.arrivalDays).toBe(2);
        expect(y.departureTime).toBe('00:02:00');
        expect(y.departureDays).toBe(2);
    });

    it('一部の駅間だけ標準時間が無ければ、出せた駅間の平均で補う', () => {
        const [b] = estimatePassingStops({
            from: time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '07:00:00',
            }),
            to: time({
                stationId: 'C',
                stopSequence: 3,
                arrivalTime: '07:06:00',
            }),
            between: [time({ stationId: 'B', stopSequence: 2 })],
            standardRunMinutes: new Map([['A>B', 4]]),
            base,
        });

        expect(b.arrivalTime).toBe('07:03:00');
    });
});
