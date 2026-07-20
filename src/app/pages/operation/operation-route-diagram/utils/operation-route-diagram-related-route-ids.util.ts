import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { visitedRouteIds } from './operation-route-diagram-visited-route-ids.util';

/**
 * P8-3: 路線チップに表示する「関連路線」を導出する（表示するチップ自体を絞り込む）。
 *
 * 全路線（相互直通先を含む十数〜二十路線）を常時表示すると煩雑なため、当該運用に
 * 無関係な路線のチップは描画自体をやめる。ただし D-4（経由路線のみ既定 ON・
 * 非経由は disabled）の対象となる「非経由だが提示する価値のある路線」は保守的に
 * 残す必要があるため、以下の 2 層で関連路線を判定する。
 *
 * 1. 経由路線（visitedRouteIds）: 運用が実際に走行した路線。
 * 2. 経由路線の駅が同時に所属する隣接路線: 二俣川・西谷のような分岐/境界駅は
 *    複数路線に同時所属するため、その駅を介して直結する路線までは「関連」として
 *    チップを残す（D-4 の非経由 disabled チップとして表示される）。
 *
 * これにより、経由路線と直接つながらない遠方路線（例: 西武秩父線・埼玉高速鉄道線）
 * のチップは表示されなくなる一方、行路描画（visibleStations$ / tripOperationLists）
 * は selectedRouteIds（既定 = visitedRouteIds）を参照元とするため本関数の結果に
 * 左右されず不変となる。
 */
export function relatedRouteIds(
    stations: readonly StationDetailsDto[],
    tripOperationLists: readonly TripOperationListDetailsDto[],
): string[] {
    const visited = new Set(visitedRouteIds(stations, tripOperationLists));

    const related = new Set<string>(visited);

    for (const station of stations) {
        const stationRouteIds = (station.routeStationLists ?? [])
            .map((rsl) => rsl.route?.routeId)
            .filter((id): id is string => !!id);

        const touchesVisited = stationRouteIds.some((id) => visited.has(id));
        if (!touchesVisited) continue;

        for (const id of stationRouteIds) {
            related.add(id);
        }
    }

    return Array.from(related);
}
