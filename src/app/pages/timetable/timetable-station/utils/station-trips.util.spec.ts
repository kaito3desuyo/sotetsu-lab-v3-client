import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { stationTrips } from './station-trips.util';

function trip(
    tripId: string,
    tripDirection: number,
    time: Record<string, unknown> | null,
): any {
    return {
        tripId,
        tripDirection,
        times: time
            ? [{ stationId: 'other' }, { stationId: 'S', ...time }]
            : [],
    };
}

function blocks(...trips: any[]): TripBlockDetailsDto[] {
    return trips.map((t, i) => ({ tripBlockId: `b${i}`, trips: [t] })) as never;
}

describe('stationTrips', () => {
    it('乗車可・降車可・時刻のある運転停車だけを取り、時刻のない通過は外す', () => {
        const result = stationTrips(
            blocks(
                trip('pickup', 0, {
                    pickupType: 0,
                    dropoffType: 1,
                    departureTime: '05:00:00',
                }),
                trip('dropoff', 0, {
                    pickupType: 1,
                    dropoffType: 0,
                    arrivalTime: '05:01:00',
                }),
                trip('opStop', 0, {
                    pickupType: 1,
                    dropoffType: 1,
                    departureTime: '05:02:00',
                }),
                trip('pass', 0, { pickupType: 1, dropoffType: 1 }),
                trip('noStation', 0, null),
            ),
            'S',
            0,
        );

        // 並びは別のテストで見る（着のある dropoff が先に来る）
        expect(result.map((t) => t.tripId).sort()).toEqual([
            'dropoff',
            'opStop',
            'pickup',
        ]);
    });

    it('他の方向の列車は外す', () => {
        const result = stationTrips(
            blocks(
                trip('up', 0, { pickupType: 0, departureTime: '05:00:00' }),
                trip('down', 1, { pickupType: 0, departureTime: '05:00:00' }),
            ),
            'S',
            0,
        );

        expect(result.map((t) => t.tripId)).toEqual(['up']);
    });

    it('API と同じく着（日・時刻）→ 発（日・時刻）の順、空は後ろに並べる', () => {
        const result = stationTrips(
            blocks(
                trip('depOnly0600', 0, {
                    pickupType: 0,
                    departureDays: 1,
                    departureTime: '06:00:00',
                }),
                trip('nextDay0010', 0, {
                    pickupType: 0,
                    arrivalDays: 2,
                    arrivalTime: '00:10:00',
                }),
                trip('arr0500', 0, {
                    pickupType: 0,
                    arrivalDays: 1,
                    arrivalTime: '05:00:00',
                }),
                trip('depOnly0530', 0, {
                    pickupType: 0,
                    departureDays: 1,
                    departureTime: '05:30:00',
                }),
            ),
            'S',
            0,
        );

        expect(result.map((t) => t.tripId)).toEqual([
            'arr0500',
            'nextDay0010',
            'depOnly0530',
            'depOnly0600',
        ]);
    });
});
