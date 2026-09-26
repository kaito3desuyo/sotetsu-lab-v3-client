import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';

/** 主要駅の根拠にしない種別（系統サフィックス「（…）」付きも先頭一致で捉える） */
const NON_MAJOR_CLASS_PREFIXES = ['各停', '回送'] as const;

/**
 * 主要駅（優等停車駅）を判定する純関数。
 *
 * 各停・回送以外の列車が発着（着時刻・発時刻のいずれかを持つ）する駅を主要駅とする。
 * 種別名は「各停（SO）」のように系統が付くため先頭一致で判定する。
 * API の欠落時刻は null で来るため `!= null` で判定する（通過駅を数えない）。
 * tripClass が不明（undefined）な場合は安全側として主要駅の根拠にする。
 */
export function determineMajorStations(
    tripBlocks: readonly TripBlockDetailsDto[],
    axisStationIds: ReadonlySet<string>,
): ReadonlySet<string> {
    const majorStationIds = new Set<string>();

    for (const block of tripBlocks) {
        for (const trip of block.trips ?? []) {
            const className = trip.tripClass?.tripClassName ?? '';
            if (NON_MAJOR_CLASS_PREFIXES.some((p) => className.startsWith(p))) {
                continue;
            }
            for (const time of trip.times ?? []) {
                if (
                    time.stationId != null &&
                    axisStationIds.has(time.stationId) &&
                    (time.arrivalTime != null || time.departureTime != null)
                ) {
                    majorStationIds.add(time.stationId);
                }
            }
        }
    }

    return majorStationIds;
}
