import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';

export type CurrentPositionLabelInput = {
    prev?: TripOperationListDetailsDto | null;
    current?: TripOperationListDetailsDto | null;
    next?: TripOperationListDetailsDto | null;
};

/**
 * OperationCurrentPositionDto の prev/current/next（operation-real-time-operation-table
 * と同じ判定分岐）を、ダッシュボードの目撃カード向けに 1 行の位置ラベルへ整形する純関数。
 * 駅名解決に失敗した場合は空文字になる（呼び出し側で表示要否を判定する）。
 */
export function formatCurrentPositionLabel(
    position: CurrentPositionLabelInput | undefined,
    stations: readonly StationDetailsDto[],
): string | undefined {
    if (!position) {
        return undefined;
    }

    const { prev, current, next } = position;
    const stationName = (stationId: string | undefined): string =>
        stations.find((s) => s.stationId === stationId)?.stationName ?? '';

    // 出庫前
    if (!prev && !current && !!next) {
        return `${stationName(next.startTime?.stationId)} 発車前`;
    }

    // 走行中
    if (!prev && !!current && !next) {
        return `${stationName(current.startTime?.stationId)} → ${stationName(
            current.endTime?.stationId,
        )}`;
    }

    // 間隙時間（停車中 or 駅間の乗り継ぎ待ち）
    if (!!prev && !current && !!next) {
        if (prev.endTime?.stationId === next.startTime?.stationId) {
            return `${stationName(prev.endTime?.stationId)} 停車中`;
        }
        return `${stationName(prev.endTime?.stationId)} → ${stationName(
            next.startTime?.stationId,
        )}`;
    }

    // 入庫済み
    if (!!prev && !current && !next) {
        return `${stationName(prev.endTime?.stationId)} 到着`;
    }

    return undefined;
}
