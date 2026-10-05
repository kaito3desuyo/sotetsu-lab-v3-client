import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { orientStationAxis } from './orient-station-axis.util';

function station(stationId: string): RouteStationDto {
    return { stationId, stationName: stationId } as RouteStationDto;
}

function trip(direction: number, stationIds: string[]): TripDetailsDto {
    return {
        tripId: `${direction}-${stationIds.join('')}`,
        tripDirection: direction,
        times: stationIds.map(
            (stationId, i) =>
                ({
                    stationId,
                    stopSequence: i + 1,
                    departureTime: '08:00:00',
                }) as TimeDetailsDto,
        ),
    } as unknown as TripDetailsDto;
}

function blocks(...trips: TripDetailsDto[]): TripBlockDetailsDto[] {
    return [{ tripBlockId: 'b', trips } as TripBlockDetailsDto];
}

// 路線の起点→終点の順（例 新横浜線: 西谷 → 羽沢横浜国大 → 新横浜）
const AXIS = [station('A'), station('B'), station('C')];

describe('orientStationAxis', () => {
    it('上りが駅の並びの先頭（起点）へ向かう路線はそのまま（本線: 上りは横浜へ）', () => {
        const result = orientStationAxis(
            AXIS,
            blocks(
                trip(ETripDirection.INBOUND, ['C', 'B', 'A']),
                trip(ETripDirection.OUTBOUND, ['A', 'B', 'C']),
            ),
        );

        expect(result.map((s) => s.stationId)).toEqual(['A', 'B', 'C']);
    });

    it('上りが駅の並びの末尾（終点）へ向かう路線は裏返す（新横浜線: 上りは新横浜へ）', () => {
        const result = orientStationAxis(
            AXIS,
            blocks(
                trip(ETripDirection.INBOUND, ['A', 'B', 'C']),
                trip(ETripDirection.INBOUND, ['B', 'C']),
                trip(ETripDirection.OUTBOUND, ['C', 'A']),
            ),
        );

        expect(result.map((s) => s.stationId)).toEqual(['C', 'B', 'A']);
    });

    it('上りの向きは多数決（例外的な列車が混ざっても本数の多い向きに従う）', () => {
        const result = orientStationAxis(
            AXIS,
            blocks(
                trip(ETripDirection.INBOUND, ['A', 'C']),
                trip(ETripDirection.INBOUND, ['A', 'B']),
                trip(ETripDirection.INBOUND, ['C', 'A']),
            ),
        );

        expect(result.map((s) => s.stationId)).toEqual(['C', 'B', 'A']);
    });

    it('駅の並びの上に停車点が 2 つ未満の列車・時刻の無い通過駅は数えない', () => {
        const passing = {
            tripId: 'p',
            tripDirection: ETripDirection.INBOUND,
            times: [
                { stationId: 'A', stopSequence: 1, departureTime: '08:00:00' },
                {
                    stationId: 'C',
                    stopSequence: 2,
                    arrivalTime: null,
                    departureTime: null,
                },
            ],
        } as unknown as TripDetailsDto;

        const result = orientStationAxis(
            AXIS,
            blocks(passing, trip(ETripDirection.INBOUND, ['D', 'A'])),
        );

        expect(result.map((s) => s.stationId)).toEqual(['A', 'B', 'C']);
    });

    it('判断できない（上りの列車が無い）ときはそのまま', () => {
        const result = orientStationAxis(AXIS, []);

        expect(result).toBe(AXIS);
    });
});
