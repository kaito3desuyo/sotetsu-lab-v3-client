import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';

function routeIdSetOf(station: StationDetailsDto): Set<string> {
    return new Set(
        (station.routeStationLists ?? [])
            .map((rsl) => rsl.route?.routeId)
            .filter((routeId): routeId is string => routeId !== undefined),
    );
}

/**
 * 表示中の駅リストを走査し、隣接する駅ペアの所属路線が完全に入れ替わる
 * （共通の路線を持たない）位置に罫線フラグを立てる純関数。
 * 分岐駅（複数路線に跨る駅）は隣接駅と路線を共有する限り罫線を引かない。
 * 戻り値は `stations` と同じ長さの配列で、各要素は「その駅の直後に罫線を引くか」を表す
 * （末尾の駅は次駅が存在しないため常に false）。
 */
export function borderAfterStation(
    stations: readonly StationDetailsDto[],
): boolean[] {
    return stations.map((station, index) => {
        const next = stations[index + 1];
        if (!next) {
            return false;
        }

        const currentRouteIds = routeIdSetOf(station);
        const nextRouteIds = routeIdSetOf(next);
        const sharesRoute = [...currentRouteIds].some((routeId) =>
            nextRouteIds.has(routeId),
        );

        return !sharesRoute;
    });
}
