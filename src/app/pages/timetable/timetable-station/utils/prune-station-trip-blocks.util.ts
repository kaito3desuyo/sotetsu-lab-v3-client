import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { stationTrips } from './station-trips.util';

/**
 * 駅別時刻表をサーバーで描くのに要る分だけに、運行（trip-block）を削る。
 *
 * - その駅に停まる列車（`stationTrips` と同じ条件）を 1 本でも持つ運行だけを残す。
 * - 残した運行の列車は全部残し、各列車の `times` は「stopSequence が最小」「最大」「その駅」の 3 つまでにする。
 *   脚注（最初と最後の時刻）・運行内の並べ替え（最初の時刻）・行の並び（その駅の時刻）はこの 3 つしか読まない。
 *
 * 削った結果は全量の代わりにならない。キャッシュには入れず、描くためだけに使う。
 */
export function pruneStationTripBlocks(
    tripBlocks: readonly TripBlockDetailsDto[],
    stationId: string,
    tripDirection: number,
): TripBlockDetailsDto[] {
    const stopping = new Set<TripDetailsDto>(
        stationTrips(tripBlocks, stationId, tripDirection),
    );

    return tripBlocks
        .filter((block) => (block.trips ?? []).some((t) => stopping.has(t)))
        .map((block) => ({
            ...block,
            trips: (block.trips ?? []).map((trip) => ({
                ...trip,
                times: pruneTimes(trip.times, stationId),
            })),
        }));
}

function pruneTimes(
    times: TimeDetailsDto[] | undefined,
    stationId: string,
): TimeDetailsDto[] | undefined {
    if (!times || times.length === 0) return times;

    let first = times[0];
    let last = times[0];
    for (const time of times) {
        if (time.stopSequence < first.stopSequence) first = time;
        if (time.stopSequence > last.stopSequence) last = time;
    }
    const atStation = times.find((time) => time.stationId === stationId);

    const keep = new Set<TimeDetailsDto>([first, last]);
    if (atStation) keep.add(atStation);
    return times.filter((time) => keep.has(time));
}
