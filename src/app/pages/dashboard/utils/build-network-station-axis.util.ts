import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';

/**
 * ダッシュボードの「計画走行本数」算出用に、対象サービス範囲の全路線の
 * routeStationLists を統合し、N2 の estimatePositions（shared/train-position.util.ts）
 * が要求する駅軸（RouteStationDto[]）へ変換する純関数。
 *
 * N1/N2 が単一路線チップで絞り込む駅軸を使うのに対し、ダッシュボードは
 * 路線を絞り込まず「今この瞬間、全路線で何本の列車が走行中か」を出したいため、
 * 全路線の駅を統合した軸を作る。複数路線に属する駅（乗換駅）が重複して
 * 含まれるが、estimatePositions 側で stationId の Set 化により吸収されるため
 * 実害はない。
 */
export function buildNetworkStationAxis(
    routes: readonly RouteDetailsDto[],
): RouteStationDto[] {
    return routes.flatMap((route) =>
        (route.routeStationLists ?? [])
            .filter((rsl) => rsl.station !== undefined)
            .map(
                (rsl) =>
                    ({
                        ...rsl.station,
                        stationSequence: rsl.stationSequence ?? 0,
                        stationNumbering: rsl.stationNumbering ?? '',
                    }) as RouteStationDto,
            ),
    );
}
