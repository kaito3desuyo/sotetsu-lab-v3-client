import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';

/**
 * 主要駅（優等停車駅）を判定する純関数。
 *
 * 35-architecture-new-pages.md §1.3: 「優等停車駅判定は tripClass 別の停車有無から導出」。
 * tripClassName が「各停」以外の列車が発着（着時刻・発時刻のいずれかを持つ）する駅を
 * 主要駅とする。tripClass が不明（undefined）な場合は安全側として「各停ではない」扱いにする。
 */
export function determineMajorStations(
    tripBlocks: readonly TripBlockDetailsDto[],
    axisStationIds: ReadonlySet<string>,
): ReadonlySet<string> {
    const majorStationIds = new Set<string>();

    for (const block of tripBlocks) {
        for (const trip of block.trips ?? []) {
            if (trip.tripClass?.tripClassName === '各停') {
                continue;
            }
            for (const time of trip.times ?? []) {
                if (
                    time.stationId !== undefined &&
                    axisStationIds.has(time.stationId) &&
                    (time.arrivalTime !== undefined ||
                        time.departureTime !== undefined)
                ) {
                    majorStationIds.add(time.stationId);
                }
            }
        }
    }

    return majorStationIds;
}
