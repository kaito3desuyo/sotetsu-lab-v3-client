import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';

export interface InterchangeRoute {
    routeId: string;
    routeName: string;
}

/**
 * 全ルートの駅一覧から、駅ごとの乗換路線（選択中路線を除く、他ルートで当該駅を含むもの）を
 * 導出する純関数。同一駅・同一路線が複数回登場しても重複させない。
 */
export function buildInterchangeRoutesByStationId(
    routes: readonly RouteDetailsDto[],
    selectedRouteId: string | null,
): ReadonlyMap<string, InterchangeRoute[]> {
    const seenByStation = new Map<string, Set<string>>();
    const result = new Map<string, InterchangeRoute[]>();

    for (const route of routes) {
        if (!route.routeId || !route.routeName || route.routeId === selectedRouteId) {
            continue;
        }

        for (const rsl of route.routeStationLists ?? []) {
            const stationId = rsl.station?.stationId;
            if (!stationId) {
                continue;
            }

            const seenRouteIds = seenByStation.get(stationId) ?? new Set<string>();
            if (seenRouteIds.has(route.routeId)) {
                continue;
            }
            seenRouteIds.add(route.routeId);
            seenByStation.set(stationId, seenRouteIds);

            const interchangeRoutes = result.get(stationId) ?? [];
            interchangeRoutes.push({
                routeId: route.routeId,
                routeName: route.routeName,
            });
            result.set(stationId, interchangeRoutes);
        }
    }

    return result;
}
