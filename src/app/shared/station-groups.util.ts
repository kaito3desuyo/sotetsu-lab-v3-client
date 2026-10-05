import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { sortByThroughServiceAgency } from './agencies-in-through-service-order.util';

/** 駅 select の 1 グループ（mat-optgroup 1 つ分）。 */
export interface StationGroup {
    routeId: string;
    /** 「会社名 路線名」（例: 相鉄 本線 / 東急 東横線） */
    label: string;
    stations: StationDetailsDto[];
}

/**
 * 駅 select の選択肢を「会社名 路線名」でまとめる（ユーザー指示 2026-09-23）。
 *
 * 駅別時刻表のページ上部と「時刻表を検索する」カードが使う。会社名は
 * 形式・会社の表示（formatFormationAnnotation）と同じ略称（agencyName）。
 * 路線は会社ごとにまとめ、会社は会社チップと同じ「相鉄と直通を始めた順」、会社の中は
 * routes の順（RouteStationListStateStore が整列済みの系統順）にする（ユーザー指示 2026-09-24。
 * 路線チップと同じ並び）。駅の並びは路線の中の順をそのまま保つ。
 * 路線をまたぐ駅（横浜・二俣川など）は各路線に重ねて出す。
 */
export function buildStationGroups(
    routes: RouteDetailsDto[],
    agencies: AgencyDetailsDto[],
): StationGroup[] {
    return sortByThroughServiceAgency(
        routes,
        (route) => route.agencyId,
        agencies,
    ).map((route) => {
        const agencyName = agencies.find(
            (agency) => agency.agencyId === route.agencyId,
        )?.agencyName;
        return {
            routeId: route.routeId,
            label: [agencyName, route.routeName].filter(Boolean).join(' '),
            stations: (route.routeStationLists ?? []).map((rsl) => rsl.station),
        };
    });
}
