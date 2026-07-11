import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';

/** 駅ID → 所属routeId集合。 */
export type RouteIdsByStation = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * 選択中の路線群（RouteStationListStateQuery.routeStations$ 由来）から、
 * 駅ID → 所属routeId集合（選択路線に限定）を構築する純関数。
 *
 * build-trip-diagram-line で「列車の経由路線に属さない駅（他分岐の駅）」を
 * 判定するために使う。未選択の路線に属する駅間関係は無視する。
 */
export function buildRouteIdsByStation(
    routes: readonly RouteDetailsDto[],
    selectedRouteIds: readonly string[],
): RouteIdsByStation {
    const selected = new Set(selectedRouteIds);
    const result = new Map<string, Set<string>>();

    for (const route of routes) {
        if (!selected.has(route.routeId)) {
            continue;
        }
        for (const rsl of route.routeStationLists ?? []) {
            const stationId = rsl.station?.stationId ?? rsl.stationId;
            if (!stationId) {
                continue;
            }
            const routeIds = result.get(stationId) ?? new Set<string>();
            routeIds.add(route.routeId);
            result.set(stationId, routeIds);
        }
    }

    return result;
}
