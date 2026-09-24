import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';

/**
 * 会社の並び = 相鉄と直通を始めた順（ユーザー指示 2026-09-24）。直通によって関わりが
 * 生まれた会社は、その直通の開始と一緒に並べる。同じ時期の中は直接の相手を先頭にする
 * （その後ろの順もユーザー指定。埼玉高速 → 都営）。
 *
 * - 2019-11 相鉄・JR直通線: JR東日本 → 東臨（JR埼京線との直通で関わる）
 * - 2023-03 相鉄・東急直通線: 東急 → 横高 → 東京メトロ → 東武 → 西武 → 埼玉高速 → 都営
 *
 * リアルタイム運用情報の編成順カードが「相鉄・JR東日本・東急」の決め打ちだったのは
 * この歴史による。直通先が増えたらここに足す。
 */
export const THROUGH_SERVICE_AGENCY_ORDER = [
    '相鉄',
    'JR東日本',
    '東臨',
    '東急',
    '横高',
    '東京メトロ',
    '東武',
    '西武',
    '埼玉高速',
    '都営',
] as const;

/**
 * 会社を「直通を始めた順」（THROUGH_SERVICE_AGENCY_ORDER）に並べる。一覧に無い会社は後ろに付け、
 * 路線の一覧（直通の系統順）で最初に出てくる順、それも無ければ元の順のままにする。
 *
 * 会社チップ（リアルタイム運用情報・過去の運用情報）と、編成を会社ごとに並べる所
 * （リアルタイム運用情報の編成順カード・過去の運用情報の表の行・todaysFormationsSorted$）が使う。
 * 以前のチップは API の返す順のままで、会社を DB に登録した日時の順（ORDER BY なし）だった。
 */
export function agenciesInThroughServiceOrder(
    agencies: readonly AgencyDetailsDto[],
    routes: readonly Pick<RouteDetailsDto, 'agencyId'>[],
): AgencyDetailsDto[] {
    const order: readonly string[] = THROUGH_SERVICE_AGENCY_ORDER;
    const rank = (agency: AgencyDetailsDto): [number, number] => {
        const known = order.indexOf(agency.agencyName);
        const routeIndex = routes.findIndex(
            (route) => route.agencyId === agency.agencyId,
        );
        return [
            known < 0 ? Infinity : known,
            routeIndex < 0 ? Infinity : routeIndex,
        ];
    };
    return agencies
        .map((agency, index) => ({ agency, index, rank: rank(agency) }))
        .sort(
            (a, b) =>
                a.rank[0] - b.rank[0] ||
                a.rank[1] - b.rank[1] ||
                a.index - b.index,
        )
        .map(({ agency }) => agency);
}

/**
 * 項目（路線など）を、その会社の「直通を始めた順」で並べ替える。同じ会社の中は元の順を保つ。
 * 路線チップ（全線時刻表・列車位置情報・列車ダイヤグラム）の会社のまとまりを、会社チップと
 * 同じ順にするために使う（ユーザー指示 2026-09-24）。
 */
export function sortByThroughServiceAgency<T>(
    items: readonly T[],
    agencyIdOf: (item: T) => string | undefined,
    agencies: readonly AgencyDetailsDto[],
): T[] {
    const ordered = agenciesInThroughServiceOrder(
        agencies,
        items.map((item) => ({ agencyId: agencyIdOf(item) })),
    ).map((agency) => agency.agencyId);
    const rank = (item: T): number => {
        const index = ordered.indexOf(agencyIdOf(item) ?? '');
        return index < 0 ? Infinity : index;
    };
    return items
        .map((item, index) => ({ item, index }))
        .sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index)
        .map(({ item }) => item);
}
