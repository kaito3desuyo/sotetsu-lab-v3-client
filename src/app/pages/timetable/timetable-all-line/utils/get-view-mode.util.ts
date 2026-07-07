import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { ETimetableAllLineStationViewMode } from '../enums/timetable-all-line.enum';

function distinctRouteIdCount(station: StationDetailsDto): number {
    return new Set(
        (station.routeStationLists ?? [])
            .map((rsl) => rsl.route?.routeId)
            .filter((routeId): routeId is string => routeId !== undefined),
    ).size;
}

/**
 * 表示中の駅ごとの表示モード（着発2段 / 発のみ / 着のみ）をダイヤデータと
 * 路線所属からデータ駆動で導出する純関数。ハードコードした駅名テーブルは持たない。
 *
 * 判定規則:
 * - **着発2段（DEPARTURE_AND_ARRIVAL）**: いずれかの列車が当駅で着時刻と発時刻の
 *   両方を持ちそれらが異なる（＝実際に停車・待避がある）、または当駅が複数路線に
 *   跨る分岐・接続駅である場合。着行を落とさないため包含的に判定する。
 * - **着のみ（ONLY_*_ARRIVAL）**: 当駅に到着する列車は存在するが、当駅を発つ列車が
 *   存在しない（＝当駅終着）場合。方向により上り/下り着のみを返す。
 * - それ以外は **発のみ（ONLY_DEPARTURE）**。
 *
 * ページ間で表示モードがブレないよう、`trips` には（ページング前の）全列車を渡すこと。
 */
export function deriveStationViewModes(
    stations: readonly StationDetailsDto[],
    trips: readonly TripDetailsDto[],
    tripDirection: 0 | 1,
): Map<string, ETimetableAllLineStationViewMode> {
    const result = new Map<string, ETimetableAllLineStationViewMode>();

    for (const station of stations) {
        const entries = trips
            .map((trip) =>
                trip.times.find((time) => time.stationId === station.stationId),
            )
            .filter((time): time is NonNullable<typeof time> => !!time);

        const hasArrival = entries.some((time) => !!time.arrivalTime);
        const hasDeparture = entries.some((time) => !!time.departureTime);
        const hasDwell = entries.some(
            (time) =>
                !!time.arrivalTime &&
                !!time.departureTime &&
                time.arrivalTime !== time.departureTime,
        );

        if (hasDwell || distinctRouteIdCount(station) >= 2) {
            result.set(
                station.stationId,
                ETimetableAllLineStationViewMode.DEPARTURE_AND_ARRIVAL,
            );
            continue;
        }

        if (hasArrival && !hasDeparture) {
            result.set(
                station.stationId,
                tripDirection === 0
                    ? ETimetableAllLineStationViewMode.ONLY_INBOUND_ARRIVAL
                    : ETimetableAllLineStationViewMode.ONLY_OUTBOUND_ARRIVAL,
            );
            continue;
        }

        result.set(
            station.stationId,
            ETimetableAllLineStationViewMode.ONLY_DEPARTURE,
        );
    }

    return result;
}
