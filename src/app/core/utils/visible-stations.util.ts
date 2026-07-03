import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';

/**
 * 選択中の路線集合から表示対象の駅リストを導出する純関数。
 * 複数路線に跨る駅（分岐駅等）は、いずれかの選択路線に属していれば表示する。
 */
export function visibleStations(
    allStations: readonly StationDetailsDto[],
    selectedRouteIds: readonly string[],
): StationDetailsDto[] {
    const selected = new Set(selectedRouteIds);

    return allStations.filter((station) =>
        (station.routeStationLists ?? []).some(
            (rsl) =>
                rsl.route?.routeId !== undefined &&
                selected.has(rsl.route.routeId),
        ),
    );
}
