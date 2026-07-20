import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';

/**
 * ダッシュボード最上部ヒーロー背景ミニダイヤの「主要駅」stationId 集合を、
 * 路線構造から**データ駆動で**導出する純関数（curated な固定リストは持たない）。
 *
 * 主要駅 = 次の 2 種の構造アンカー。これらだけで結ぶとダイヤの形（列車が
 * どこで発着・分岐・合流するか）が読め、全駅を結ぶより線分数が激減する。
 *  1. 各路線の起終点（stationSequence の最小・最大の駅 = 終着駅）
 *  2. 複数の routeId に属する駅（乗換・分岐駅）
 *
 * ヒーローは 8% 透かしの装飾であり、この粗化は本編のダイヤグラム
 * （train-diagram）や時刻表の情報には一切影響しない。
 */
export function selectMajorStationIds(
    routes: readonly RouteDetailsDto[],
): Set<string> {
    const majorStationIds = new Set<string>();
    const routeIdsByStationId = new Map<string, Set<string>>();

    for (const route of routes) {
        const stops = (route.routeStationLists ?? []).filter(
            (rsl) => rsl.stationId != null,
        );
        if (stops.length === 0) {
            continue;
        }

        // 各路線の起終点（stationSequence の最小・最大）を終着アンカーとして採用。
        let firstStop = stops[0];
        let lastStop = stops[0];
        for (const rsl of stops) {
            const sequence = rsl.stationSequence ?? 0;
            if (sequence < (firstStop.stationSequence ?? 0)) {
                firstStop = rsl;
            }
            if (sequence > (lastStop.stationSequence ?? 0)) {
                lastStop = rsl;
            }
        }
        majorStationIds.add(firstStop.stationId as string);
        majorStationIds.add(lastStop.stationId as string);

        // routeId 所属を記録し、後段で複数路線に属する駅（乗換・分岐駅）を判定。
        for (const rsl of stops) {
            const stationId = rsl.stationId as string;
            const set = routeIdsByStationId.get(stationId) ?? new Set<string>();
            set.add(route.routeId);
            routeIdsByStationId.set(stationId, set);
        }
    }

    for (const [stationId, routeIds] of routeIdsByStationId) {
        if (routeIds.size >= 2) {
            majorStationIds.add(stationId);
        }
    }

    return majorStationIds;
}
