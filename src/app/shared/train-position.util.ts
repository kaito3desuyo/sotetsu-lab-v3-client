import { getRailwayDate, toAbsoluteTime } from 'src/app/core/utils/railway-day';
import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';

/**
 * 列車位置算出（N2 列車位置情報ページ）の純関数群。
 * 時刻表データのみを根拠とした「計画在線」を算出する（実在線ではない）。
 * データ取得・HTTP・グローバル状態は一切扱わない（呼び出し側の責務）。
 */

export type TrainPosition =
    | {
          type: 'stopped';
          tripId: string;
          stationId: string;
      }
    | {
          type: 'between';
          tripId: string;
          fromStationId: string;
          toStationId: string;
          /** 0〜1 の駅間内分比（線形補間） */
          progress: number;
      };

/**
 * 発着時刻の実体化。arrivalTime/departureTime の片方が欠落している場合
 * （通過駅・起終点駅）はもう片方で代用する。
 */
function resolveArrival(base: Date, time: TimeDetailsDto): Date | undefined {
    const value = time.arrivalTime ?? time.departureTime;
    if (value === undefined) {
        return undefined;
    }
    return toAbsoluteTime(base, time.arrivalDays ?? time.departureDays ?? 0, value);
}

function resolveDeparture(base: Date, time: TimeDetailsDto): Date | undefined {
    const value = time.departureTime ?? time.arrivalTime;
    if (value === undefined) {
        return undefined;
    }
    return toAbsoluteTime(base, time.departureDays ?? time.arrivalDays ?? 0, value);
}

/**
 * 1 trip 分の times から、駅軸に存在する停車点のみを stopSequence 順に抽出する。
 * 駅軸に存在しない駅（路線を跨ぐ列車の他路線区間）・発着時刻が両方とも
 * 欠落している通過駅は除外され、結果として前後の駅間補間に自然に吸収される。
 */
function extractStopsOnAxis(
    times: TimeDetailsDto[],
    axisStationIds: ReadonlySet<string>,
): TimeDetailsDto[] {
    return times
        .filter(
            (t) =>
                t.stationId !== undefined &&
                axisStationIds.has(t.stationId) &&
                (t.arrivalTime !== undefined || t.departureTime !== undefined),
        )
        .sort((a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0));
}

function estimateTripPosition(
    tripId: string,
    times: TimeDetailsDto[],
    axisStationIds: ReadonlySet<string>,
    base: Date,
    at: Date,
): TrainPosition | undefined {
    const stops = extractStopsOnAxis(times, axisStationIds);
    if (stops.length < 2) {
        return undefined;
    }

    // 駅軸上で最初に判明する時刻（着時刻優先、なければ発時刻）より前は未出発として扱う。
    // 起点駅（着時刻が無い）は発時刻がそのまま最初の判明時刻になる。
    // 駅軸の入口駅で既に停車中（着時刻 <= at < 発時刻）というケース（路線を跨ぐ列車が
    // 軸の入口駅に到着済で停車している）も「未出発」扱いにしないため、発時刻ではなく
    // 着時刻（フォールバック込み）を基準にする。
    const firstArrival = resolveArrival(base, stops[0]);
    const lastArrival = resolveArrival(base, stops[stops.length - 1]);
    if (firstArrival === undefined || lastArrival === undefined) {
        return undefined;
    }

    if (at < firstArrival) {
        return undefined; // 未出発
    }
    if (at >= lastArrival) {
        return undefined; // 到着済
    }

    for (let i = 0; i < stops.length; i++) {
        const stationId = stops[i].stationId as string;
        const arrival = resolveArrival(base, stops[i]);
        const departure = resolveDeparture(base, stops[i]);

        if (
            arrival !== undefined &&
            departure !== undefined &&
            at >= arrival &&
            at < departure
        ) {
            return { type: 'stopped', tripId, stationId };
        }

        if (i < stops.length - 1 && departure !== undefined) {
            const nextStationId = stops[i + 1].stationId as string;
            const nextArrival = resolveArrival(base, stops[i + 1]);
            if (
                nextArrival !== undefined &&
                at >= departure &&
                at < nextArrival
            ) {
                const progress =
                    (at.getTime() - departure.getTime()) /
                    (nextArrival.getTime() - departure.getTime());
                return {
                    type: 'between',
                    tripId,
                    fromStationId: stationId,
                    toStationId: nextStationId,
                    progress,
                };
            }
        }
    }

    return undefined;
}

/**
 * 全 tripBlock を走査し、指定時刻 `at` 時点の在線一覧を算出する。
 *
 * - 各 trip の times を stopSequence 順に走査し、toAbsoluteTime で実時刻化して判定する
 * - 未出発（at < 最初の発時刻）・到着済（最後の着時刻 ≤ at）は結果に含めない
 * - 停車中判定: 駅 s の着 ≤ at < 発 → stopped
 * - 走行中判定: 駅 s の発 ≤ at < 駅 s+1 の着 → between（progress は線形補間）
 * - 通過駅（駅軸に存在しない・発着時刻が両方欠落）は区間補間に自然に吸収される
 * - 鉄道日（4 時境界）を考慮し、`at` の属する営業日を基準に times の日オフセットを実体化する
 *
 * @param tripBlocks 対象ダイヤの全 tripBlock（tripDirection 上下分含めて呼び出し側で束ねたもの）
 * @param stationAxis 対象路線の駅リスト（route-stations 由来。順序は問わない）
 * @param at 位置算出の基準時刻
 */
export function estimatePositions(
    tripBlocks: TripBlockDetailsDto[],
    stationAxis: RouteStationDto[],
    at: Date,
): TrainPosition[] {
    const axisStationIds = new Set(
        stationAxis
            .map((s) => s.stationId)
            .filter((id): id is string => id !== undefined),
    );
    const base = getRailwayDate(at);

    const positions: TrainPosition[] = [];
    for (const block of tripBlocks) {
        for (const trip of block.trips ?? []) {
            if (trip.tripId === undefined || trip.times === undefined) {
                continue;
            }
            const position = estimateTripPosition(
                trip.tripId,
                trip.times,
                axisStationIds,
                base,
                at,
            );
            if (position !== undefined) {
                positions.push(position);
            }
        }
    }
    return positions;
}
