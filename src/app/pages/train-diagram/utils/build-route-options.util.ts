import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { sortByThroughServiceAgency } from 'src/app/shared/agencies-in-through-service-order.util';
import { FilterChipOption } from 'src/app/shared/filter-chips/filter-chip-option.type';

/**
 * 路線チップの選択肢。会社名でまとめ（相鉄 / JR東日本 / 東急 …）、会社のまとまりは
 * 会社チップと同じ「相鉄と直通を始めた順」に並べる（会社の中は系統順のまま）。
 * チップ（コントローラー）と畳んだ 1 行の要約（ページ）の両方がこれを使い、要約がチップとずれないようにする。
 */
export function buildRouteOptions(
    routes: readonly {
        routeId: string;
        routeName?: string;
        agencyId?: string;
    }[],
    agencies: readonly AgencyDetailsDto[],
): FilterChipOption[] {
    const agencyNameById = new Map(
        agencies.map((agency) => [agency.agencyId, agency.agencyName]),
    );
    return sortByThroughServiceAgency(
        routes,
        (route) => route.agencyId,
        agencies,
    ).map((route) => ({
        value: route.routeId,
        label: route.routeName ?? '',
        group: route.agencyId ? agencyNameById.get(route.agencyId) : undefined,
    }));
}
