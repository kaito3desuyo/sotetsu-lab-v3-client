import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';

/**
 * 図の駅の並びを、上りの列車がいつも図の上へ進む向きにそろえる純関数。
 *
 * 駅の並びは路線の起点→終点の順で来るが、上りが起点へ向かうとは限らない
 * （本線は上りが起点の横浜へ、新横浜線は上りが終点の新横浜へ向かう）。
 * 図は左側通行（上りを左の列に置き上へ進ませる）なので、上りが終点へ向かう路線では
 * 並びを裏返す（ユーザー判断 2026-09-26）。向きは決め打ちせず、上りの列車が
 * 並びのどちらへ進むかの多数決で決める。判断できなければそのまま返す。
 */
export function orientStationAxis(
    axis: RouteStationDto[],
    tripBlocks: readonly TripBlockDetailsDto[],
): RouteStationDto[] {
    const indexByStationId = new Map(
        axis.map((station, index) => [station.stationId, index]),
    );
    let towardStart = 0;
    let towardEnd = 0;

    for (const block of tripBlocks) {
        for (const trip of block.trips ?? []) {
            if (trip.tripDirection !== ETripDirection.INBOUND) {
                continue;
            }
            const indexes = [...(trip.times ?? [])]
                .filter(
                    (time) =>
                        time.stationId != null &&
                        indexByStationId.has(time.stationId) &&
                        (time.arrivalTime != null ||
                            time.departureTime != null),
                )
                .sort((a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0))
                .map((time) => indexByStationId.get(time.stationId as string));
            if (indexes.length < 2) {
                continue;
            }
            const moved =
                (indexes[indexes.length - 1] as number) -
                (indexes[0] as number);
            if (moved < 0) towardStart++;
            if (moved > 0) towardEnd++;
        }
    }

    return towardEnd > towardStart ? [...axis].reverse() : axis;
}
