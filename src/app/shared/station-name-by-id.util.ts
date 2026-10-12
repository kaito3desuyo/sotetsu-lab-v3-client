import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';

/**
 * 全路線の駅から stationId → 駅名 のマップを作る。行き先（trip 最終駅）は
 * 表示中の路線軸外（直通先の他社線駅）になりうるため、軸ではなく全駅から引く。
 */
export function buildStationNameById(
    routeStations: readonly RouteDetailsDto[],
): Map<string, string> {
    const map = new Map<string, string>();
    for (const route of routeStations) {
        for (const rsl of route.routeStationLists ?? []) {
            const station = rsl.station;
            if (station?.stationId && station.stationName) {
                map.set(station.stationId, station.stationName);
            }
        }
    }
    return map;
}
