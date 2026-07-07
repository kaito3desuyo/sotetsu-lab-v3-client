import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';

/**
 * B5: 運用が経由する路線 ID を導出する（既定 ON = 経由路線のみ・非経由チップ disabled の判定に使う）。
 *
 * 運用の全区間（tripOperationLists）の始発・終着駅から実際に停車した駅集合を求め、
 * その駅が所属する路線（`routeStationLists`）を路線チップの初期選択・disabled 判定に使う。
 *
 * 分岐駅（複数路線に所属する駅、例: 二俣川）を経由した場合はその駅が所属する
 * 全路線を「経由路線」とみなす（区間の始発・終着駅のみから実際にどちらの
 * 方向へ進んだかまでは判定できないための近似）。
 */
export function visitedRouteIds(
    stations: readonly StationDetailsDto[],
    tripOperationLists: readonly TripOperationListDetailsDto[],
): string[] {
    const visitedStationIds = new Set(
        (tripOperationLists ?? []).flatMap((t) =>
            [t.startTime?.stationId, t.endTime?.stationId].filter(Boolean),
        ),
    );

    const routeIds = new Set<string>();

    for (const station of stations) {
        if (!visitedStationIds.has(station.stationId)) continue;

        for (const rsl of station.routeStationLists ?? []) {
            if (rsl.route?.routeId) {
                routeIds.add(rsl.route.routeId);
            }
        }
    }

    return Array.from(routeIds);
}
