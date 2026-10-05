import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';

/** 自社（相鉄）の agencyName。他ページ（train-diagram-controller 等）と同一の判定基準。 */
const OWN_AGENCY_NAME = '相鉄';

/**
 * 路線チップの既定選択（自社＝相鉄の路線だけ）を導出する純関数。
 * 列車情報入力フォーム（P8-4）と全線時刻表（2026-09-24 ユーザー指示）が使う。
 * 全路線を既定選択にすると初期視界を占有するため、自社路線のみに絞る
 * （他社の路線も引き続き選べる。情報削減ではなく「初期状態でチェックが入っている路線」を絞る）。
 * agency 情報が未取得/自社路線が1つも解決できない場合は、全路線にフォールバックする。
 */
export function ownAgencyRouteIds(
    routes: readonly Pick<RouteDetailsDto, 'routeId' | 'agencyId'>[],
    agencies: readonly AgencyDetailsDto[],
): string[] {
    const ownAgencyIds = new Set(
        agencies
            .filter((agency) => agency.agencyName === OWN_AGENCY_NAME)
            .map((agency) => agency.agencyId),
    );

    const ownRouteIds = routes
        .filter((route) => !!route.agencyId && ownAgencyIds.has(route.agencyId))
        .map((route) => route.routeId);

    return ownRouteIds.length
        ? ownRouteIds
        : routes.map((route) => route.routeId);
}
