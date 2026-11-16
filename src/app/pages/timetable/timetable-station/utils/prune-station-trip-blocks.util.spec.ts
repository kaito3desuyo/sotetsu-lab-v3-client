import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TimetableStationFindLastStopStationPipe } from '../pipes/timetable-station-find-last-stop-station.pipe';
import { pruneStationTripBlocks } from './prune-station-trip-blocks.util';
import { stationTrips } from './station-trips.util';

const STATIONS = ['A', 'B', 'C', 'D', 'E'];

/** A→E の 5 駅を通る列車。stops に入る駅は停車、それ以外は通過 */
function makeTrip(
    tripId: string,
    startMinutes: number,
    stops: string[],
    tripDirection = 0,
): TripDetailsDto {
    const times: TimeDetailsDto[] = STATIONS.map((stationId, i) => {
        const total = startMinutes + i * 5;
        const days = Math.floor(total / 1440) + 1;
        const minutes = total % 1440;
        const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
        const mm = String(minutes % 60).padStart(2, '0');
        const stop = stops.includes(stationId);
        return {
            timeId: `${tripId}-${stationId}`,
            tripId,
            stationId,
            stopSequence: i + 1,
            pickupType: stop ? 0 : 1,
            dropoffType: stop ? 0 : 1,
            // 通過駅は時刻を持たない（持つと運転停車として停まる扱いになる）
            arrivalDays: stop ? days : undefined,
            arrivalTime: stop ? `${hh}:${mm}:00` : undefined,
            departureDays: stop ? days : undefined,
            departureTime: stop ? `${hh}:${mm}:00` : undefined,
        };
    });
    // 順序が崩れても stopSequence で選べることを見るため、逆順に並べる
    return {
        tripId,
        tripDirection,
        tripBlockId: `b-${tripId}`,
        times: times.reverse(),
    };
}

function block(id: string, ...trips: TripDetailsDto[]): TripBlockDetailsDto {
    return { tripBlockId: id, trips };
}

describe('pruneStationTripBlocks', () => {
    // 0 時台（日をまたぎ departureDays 2）の列車と、折り返しで 2 本つながる運行を含める
    const blocks = (): TripBlockDetailsDto[] => [
        block('x1', makeTrip('t1', 300, ['A', 'C', 'E'])),
        block('x2', makeTrip('t2', 310, ['A', 'B', 'E'])), // C を通過
        block(
            'x3',
            makeTrip('t3', 1430, ['A', 'C', 'E']), // 0 時台
            makeTrip('t3b', 1500, ['A', 'C', 'E']),
        ),
        block('x4', makeTrip('t4', 320, ['A', 'C', 'E'], 1)), // 逆方向
    ];

    it('その駅に停まる列車を持たない運行を落とす', () => {
        const result = pruneStationTripBlocks(blocks(), 'C', 0);

        expect(result.map((b) => b.tripBlockId)).toEqual(['x1', 'x3']);
    });

    it('残した運行の列車は全部残し、times は最初・最後・その駅の 3 つ以下にする', () => {
        const result = pruneStationTripBlocks(blocks(), 'C', 0);

        expect(result[1].trips.map((t) => t.tripId)).toEqual(['t3', 't3b']);
        for (const trip of result.flatMap((b) => b.trips)) {
            expect(trip.times.map((t) => t.stationId).sort()).toEqual([
                'A',
                'C',
                'E',
            ]);
        }
    });

    it('その駅が始発・終着なら重ねずに 2 つにする', () => {
        const result = pruneStationTripBlocks(blocks(), 'A', 0);

        expect(result[0].trips[0].times).toHaveLength(2);
    });

    it('stationTrips の結果が、削る前と同じ列車 ID の並びになる（0 時台を含む）', () => {
        const before = blocks();
        const after = pruneStationTripBlocks(before, 'C', 0);

        const ids = (b: TripBlockDetailsDto[]) =>
            stationTrips(b, 'C', 0).map((t) => t.tripId);
        expect(ids(after)).toEqual(ids(before));
        expect(ids(after)).toEqual(['t1', 't3', 't3b']);
    });

    it('脚注（最後の停車駅）の行き先が削る前と同じになる', () => {
        const pipe = new TimetableStationFindLastStopStationPipe();
        const destinations = (b: TripBlockDetailsDto[]) =>
            stationTrips(b, 'C', 0).map((trip) =>
                pipe.transform({
                    ...trip,
                    tripBlock: b.find((o) =>
                        o.trips.some((t) => t.tripId === trip.tripId),
                    ),
                }),
            );
        const before = blocks();

        expect(destinations(pruneStationTripBlocks(before, 'C', 0))).toEqual(
            destinations(before),
        );
    });

    it('元の配列を書き換えない', () => {
        const before = blocks();
        pruneStationTripBlocks(before, 'C', 0);

        expect(before[0].trips[0].times).toHaveLength(5);
        expect(before).toHaveLength(4);
    });
});
