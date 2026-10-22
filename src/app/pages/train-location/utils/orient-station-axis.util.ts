import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';
import {
    findInboundDirection,
    OperatingSystemEnds,
} from 'src/app/shared/inbound-direction.util';

/**
 * 図の駅の並びを、上りの列車がいつも図の上へ進む向きにそろえる純関数。
 *
 * 駅の並びは路線の起点→終点の順で来るが、上りが起点へ向かうとは限らない
 * （本線は上りが起点の横浜へ、新横浜線は上りが終点の新横浜へ向かう）。
 * 図は左側通行（上りを左の列に置き上へ進ませる）なので、上りが終点へ向かう路線では
 * 並びを裏返す（ユーザー判断 2026-09-26）。向きは運行系統の始点側を上りとして決める
 * （`findInboundDirection`。駅別時刻表の前後の駅と共通・2026-10-23）。判断できなければそのまま返す。
 */
export function orientStationAxis(
    axis: RouteStationDto[],
    ends: OperatingSystemEnds | undefined,
): RouteStationDto[] {
    return findInboundDirection(
        axis.map((station) => station.stationId),
        ends,
    ) === 'towardEnd'
        ? [...axis].reverse()
        : axis;
}
