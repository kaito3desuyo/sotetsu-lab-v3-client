import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';

/**
 * ダイヤグラム描画の座標変換ユーティリティ（純関数のみ）。
 * N1 ダイヤグラムページ用に新設するが、将来的に運用行路図の時刻軸化や
 * ダッシュボードのミニダイヤ表示にも流用する想定（データ取得は呼び出し側の責務）。
 */

/** stationId → y 座標。buildStationAxis の返り値であり、stationToY はこれを読むだけ。 */
export type StationAxis = ReadonlyMap<string, number>;

/**
 * 時刻窓の起点からの経過分を x 座標へ変換する。
 */
export function timeToX(
    minutesFromWindowStart: number,
    pxPerMinute: number,
): number {
    return minutesFromWindowStart * pxPerMinute;
}

/**
 * 駅軸上の y 座標を取得する。
 */
export function stationToY(stationId: string, axis: StationAxis): number {
    const y = axis.get(stationId);
    if (y === undefined) {
        throw new Error(
            `stationToY: 駅軸に存在しない stationId です: ${stationId}`,
        );
    }
    return y;
}

function parseTimeToMinutes(time: string): number | undefined {
    const match = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(time);
    if (!match) {
        return undefined;
    }
    const [, hours, minutes, seconds] = match;
    return Number(hours) * 60 + Number(minutes) + Number(seconds) / 60;
}

function toAbsoluteMinutes(
    days: number | undefined,
    time: string | undefined,
): number | undefined {
    if (time === undefined) {
        return undefined;
    }
    const minutes = parseTimeToMinutes(time);
    if (minutes === undefined) {
        return undefined;
    }
    return (days ?? 0) * 24 * 60 + minutes;
}

/**
 * 駅間の所要分を代表各停 1 本の times から導出する。
 * 発車側は発時刻優先（無ければ着時刻）、到着側は着時刻優先（無ければ発時刻）で算出する。
 * 導出不能・0以下（データ不整合）の場合は undefined を返し、呼び出し側で等間隔フォールバックする。
 */
function deriveSegmentMinutes(
    fromStationId: string,
    toStationId: string,
    representativeTripTimes: readonly TimeDetailsDto[],
): number | undefined {
    const fromTime = representativeTripTimes.find(
        (t) => t.stationId === fromStationId,
    );
    const toTime = representativeTripTimes.find(
        (t) => t.stationId === toStationId,
    );
    if (!fromTime || !toTime) {
        return undefined;
    }

    const departureMinutes =
        toAbsoluteMinutes(fromTime.departureDays, fromTime.departureTime) ??
        toAbsoluteMinutes(fromTime.arrivalDays, fromTime.arrivalTime);
    const arrivalMinutes =
        toAbsoluteMinutes(toTime.arrivalDays, toTime.arrivalTime) ??
        toAbsoluteMinutes(toTime.departureDays, toTime.departureTime);

    if (departureMinutes === undefined || arrivalMinutes === undefined) {
        return undefined;
    }

    const duration = arrivalMinutes - departureMinutes;
    return duration > 0 ? duration : undefined;
}

/**
 * 駅の stationSequence 順リストから、代表各停 1 本（1路線分）の times を用いて
 * 駅間所要分の比例配分で y 座標を割り当てる。
 * 所要分が導出できない駅間は、導出できた区間の平均所要分（1 区間も導出できなければ
 * 既定値 1）を使い、等間隔フォールバックする。
 *
 * @param stations 対象路線の駅リスト（stationSequence 順である必要はない。内部で並べ替える）
 * @param representativeTripTimes 代表各停 1 本分の times（HTTP 取得は呼び出し側の責務）
 */
export function buildStationAxis(
    stations: readonly RouteStationDto[],
    representativeTripTimes: readonly TimeDetailsDto[],
): StationAxis {
    const ordered = [...stations].sort(
        (a, b) => (a.stationSequence ?? 0) - (b.stationSequence ?? 0),
    );

    const segmentMinutes = ordered
        .slice(1)
        .map((station, index) =>
            deriveSegmentMinutes(
                ordered[index].stationId,
                station.stationId,
                representativeTripTimes,
            ),
        );

    const knownMinutes = segmentMinutes.filter(
        (minutes): minutes is number => minutes !== undefined,
    );
    const fallbackMinutes =
        knownMinutes.length > 0
            ? knownMinutes.reduce((sum, minutes) => sum + minutes, 0) /
              knownMinutes.length
            : 1;

    const axis = new Map<string, number>();
    let y = 0;
    ordered.forEach((station, index) => {
        if (index > 0) {
            y += segmentMinutes[index - 1] ?? fallbackMinutes;
        }
        axis.set(station.stationId, y);
    });

    return axis;
}
