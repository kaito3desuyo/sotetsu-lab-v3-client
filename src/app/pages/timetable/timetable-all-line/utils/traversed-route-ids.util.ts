import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';

/**
 * 運行が走る路線の routeId を返す。路線の駅のうち 2 駅以上に時刻（停車・通過）がある路線を
 * 「走る路線」とみなす（乗換駅を 1 つ共有するだけの路線は入れない）。
 * 時刻のある駅がすべて別の路線にも含まれる路線は外す（東横線を走る列車に、日吉〜田園調布を
 * 共有する目黒線を足さない）。
 *
 * 列車番号のリンクから運行を絞り込んで開いたときの、路線チップの初期選択に使う。
 * 既定の「相鉄の路線だけ」だと、埼京線で完結する列車が表から消え、直通先の区間も隠れていた。
 * 走る路線が 1 つも決まらないときは空配列を返す（呼び出し側が既定に戻す）。
 */
export function traversedRouteIds(
    stations: readonly StationDetailsDto[],
    tripBlocks: readonly TripBlockDetailsDto[],
): string[] {
    const stationIds = new Set(
        tripBlocks.flatMap((block) =>
            (block.trips ?? []).flatMap((trip) =>
                (trip.times ?? []).map((time) => time.stationId),
            ),
        ),
    );

    const stationsByRoute = new Map<string, Set<string>>();
    for (const station of stations) {
        if (!stationIds.has(station.stationId)) continue;
        for (const rsl of station.routeStationLists ?? []) {
            const routeId = rsl.route?.routeId;
            if (!routeId) continue;
            const set = stationsByRoute.get(routeId) ?? new Set<string>();
            set.add(station.stationId);
            stationsByRoute.set(routeId, set);
        }
    }

    const candidates = [...stationsByRoute].filter(([, set]) => set.size >= 2);
    return candidates
        .filter(
            ([, set]) =>
                !candidates.some(
                    ([, other]) =>
                        other.size > set.size && isSubset(set, other),
                ),
        )
        .map(([routeId]) => routeId);
}

function isSubset(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
    for (const value of a) {
        if (!b.has(value)) return false;
    }
    return true;
}
