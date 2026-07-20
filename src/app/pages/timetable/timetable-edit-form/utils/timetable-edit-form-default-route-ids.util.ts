import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';

/** 自社（相鉄）の agencyName。他ページ（train-diagram-controller 等）と同一の判定基準。 */
const OWN_AGENCY_NAME = '相鉄';

/**
 * P8-4: 列車情報入力フォームの路線チップ既定選択を導出する純関数。
 * 全路線（約19路線）を既定選択にすると初期視界を占有するため、自社（相鉄）
 * 路線のみを既定選択にする（全路線は折り畳みパネル内で引き続き選択可能・
 * 情報削減はしない。あくまで「初期状態でチェックが入っている路線」を絞る）。
 * agency 情報が未取得/自社路線が1つも解決できない場合は、従来どおり
 * 全路線を既定選択にフォールバックする。
 */
export function timetableEditFormDefaultRouteIds(
    routes: readonly RouteDetailsDto[],
    agencies: readonly AgencyDetailsDto[],
): string[] {
    const ownAgencyIds = new Set(
        agencies
            .filter((agency) => agency.agencyName === OWN_AGENCY_NAME)
            .map((agency) => agency.agencyId),
    );

    const ownRouteIds = routes
        .filter(
            (route) => !!route.agencyId && ownAgencyIds.has(route.agencyId),
        )
        .map((route) => route.routeId);

    return ownRouteIds.length
        ? ownRouteIds
        : routes.map((route) => route.routeId);
}
