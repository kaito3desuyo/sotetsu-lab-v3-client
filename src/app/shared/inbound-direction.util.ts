/** 上りの列車が駅の並びのどちらへ進むか */
export type InboundDirection = 'towardStart' | 'towardEnd';

/**
 * 運行系統（operating_systems）の中でその路線を走る区間の始点駅・終点駅。
 * 系統は東京側 → 相鉄の向きに並ぶので、始点側が相鉄から見た上り側になる
 * （直通先の会社の上り下りとは限らない。池袋線は吾野 → 池袋）。
 */
export interface OperatingSystemEnds {
    startStationId: string;
    endStationId: string;
}

/**
 * 上りの列車が駅の並びのどちらへ進むかを、系統の始点・終点の位置で決める純関数。
 *
 * 駅の並びの向きは問わない（路線の起点→終点でも、裏返した並びでもよい）。
 * 始点か終点が並びに無い・系統に無い路線は null。
 * 列車位置情報の図の向きと、駅別時刻表の前後の駅の左右が使う（ユーザー指示 2026-10-23）。
 */
export function findInboundDirection(
    stationIds: readonly string[],
    ends: OperatingSystemEnds | undefined,
): InboundDirection | null {
    if (!ends) return null;
    const start = stationIds.indexOf(ends.startStationId);
    const end = stationIds.indexOf(ends.endStationId);
    if (start === -1 || end === -1 || start === end) return null;
    return start < end ? 'towardStart' : 'towardEnd';
}
