import { getRailwayDate, toAbsoluteTime } from 'src/app/core/utils/railway-day';
import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

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
          /** 折返しで発時刻を待っている（ホームか留置線かは分からない） */
          turnaround?: true;
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
/**
 * trip times の days は **1-based**（day 1 = 運行の営業日当日、day 2 = 24 時超えの翌日分）で
 * 実データが格納されている。toAbsoluteTime は 0 始まりの日オフセットを取るため、-1 して渡す
 * （営業日 = getRailwayDate(at) の 0 時基準に一致させる）。欠落時は day 1（オフセット 0）とみなす。
 */
function dayOffset(days: number | null | undefined): number {
    return (days ?? 1) - 1;
}

export function resolveArrival(
    base: Date,
    time: TimeDetailsDto,
): Date | undefined {
    const value = time.arrivalTime ?? time.departureTime;
    // API の欠落時刻は null で来る（undefined ではない）ため == null で両方を捉える。
    if (value == null) {
        return undefined;
    }
    return toAbsoluteTime(
        base,
        dayOffset(time.arrivalDays ?? time.departureDays),
        value,
    );
}

export function resolveDeparture(
    base: Date,
    time: TimeDetailsDto,
): Date | undefined {
    const value = time.departureTime ?? time.arrivalTime;
    if (value == null) {
        return undefined;
    }
    return toAbsoluteTime(
        base,
        dayOffset(time.departureDays ?? time.arrivalDays),
        value,
    );
}

function hasTime(time: TimeDetailsDto): boolean {
    return time.arrivalTime != null || time.departureTime != null;
}

/** 時刻のある停車点を stopSequence 順に並べる */
export function timedStops(
    times: readonly TimeDetailsDto[] | undefined,
): TimeDetailsDto[] {
    return [...(times ?? [])]
        .filter(hasTime)
        .sort((a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0));
}

/** 並べ替え用の営業日内の分（days は 1 始まり。発時刻を優先） */
function minutesOfDay(time: TimeDetailsDto): number {
    const value = time.departureTime ?? time.arrivalTime ?? '00:00:00';
    const days = (time.departureDays ?? time.arrivalDays ?? 1) - 1;
    const [hours = 0, minutes = 0] = value.split(':').map(Number);
    return days * 1440 + hours * 60 + minutes;
}

/**
 * 同じ運用のまとまり（trip block）の中で、ある列車の終点から同じ編成が次の列番で発つ
 * （種別変更・列番の付け替え）とき、tripId → 次の列車 を返す。
 * trip block は同じ向きに走り続ける列車の連なりなので、終点の駅が次の列車の始発と
 * 同じなら引き継ぎとみなす（実データで折り返しは block に含まれない）。
 */
export function findContinuations(
    tripBlocks: readonly TripBlockDetailsDto[],
): ReadonlyMap<string, TripDetailsDto> {
    const continuations = new Map<string, TripDetailsDto>();
    for (const block of tripBlocks) {
        const ordered = (block.trips ?? [])
            .map((trip) => ({ trip, stops: timedStops(trip.times) }))
            .filter((entry) => entry.stops.length > 0)
            .sort(
                (a, b) => minutesOfDay(a.stops[0]) - minutesOfDay(b.stops[0]),
            );
        for (let i = 0; i < ordered.length - 1; i++) {
            const current = ordered[i];
            const next = ordered[i + 1];
            const last = current.stops[current.stops.length - 1];
            if (
                current.trip.tripId &&
                last.stationId != null &&
                last.stationId === next.stops[0].stationId
            ) {
                continuations.set(current.trip.tripId, next.trip);
            }
        }
    }
    return continuations;
}

/** 出庫する列車を、発時刻のどれだけ前から始発駅に停車中として出すか（ユーザー指示 2026-10-07: 3 分前ぐらい） */
const DEPOT_OUT_LEAD_MS = 3 * 60 * 1000;

/**
 * 折り返し: 同じ運用の列車が終点に着き、別の trip block（逆向き）で同じ駅を発つとき、
 * 発つ列車の tripId → 着く列車 を返す。折り返しは block に含まれないので運用でつなぐ。
 * 入庫する列車・出庫する列車は車両基地を挟むので含めない。
 */
export function findTurnarounds(
    tripBlocks: readonly TripBlockDetailsDto[],
): ReadonlyMap<string, TripDetailsDto> {
    const entriesByOperationId = new Map<
        string,
        {
            trip: TripDetailsDto;
            block: TripBlockDetailsDto;
            stops: TimeDetailsDto[];
        }[]
    >();
    for (const block of tripBlocks) {
        for (const trip of block.trips ?? []) {
            const operationId = trip.tripOperationLists?.[0]?.operationId;
            const stops = timedStops(trip.times);
            if (!operationId || stops.length === 0) {
                continue;
            }
            const entries = entriesByOperationId.get(operationId) ?? [];
            entries.push({ trip, block, stops });
            entriesByOperationId.set(operationId, entries);
        }
    }

    const turnarounds = new Map<string, TripDetailsDto>();
    for (const entries of entriesByOperationId.values()) {
        entries.sort(
            (a, b) => minutesOfDay(a.stops[0]) - minutesOfDay(b.stops[0]),
        );
        for (let i = 0; i < entries.length - 1; i++) {
            const previous = entries[i];
            const next = entries[i + 1];
            const last = previous.stops[previous.stops.length - 1];
            if (
                next.trip.tripId &&
                previous.block !== next.block &&
                !previous.trip.depotIn &&
                !next.trip.depotOut &&
                last.stationId != null &&
                last.stationId === next.stops[0].stationId
            ) {
                turnarounds.set(next.trip.tripId, previous.trip);
            }
        }
    }
    return turnarounds;
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
                t.stationId != null &&
                axisStationIds.has(t.stationId) &&
                // 発着とも欠落（null/undefined）の通過駅は除外し、前後駅間の補間に吸収させる。
                (t.arrivalTime != null || t.departureTime != null),
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
        // 駅軸の最後の停車駅から他線へ直通する列車は、そこを発つまで停車中として残す
        // （終点では発時刻が無く resolveDeparture が着時刻に落ちるので、着いた時点で消える）
        const lastStop = stops[stops.length - 1];
        const lastDeparture = resolveDeparture(base, lastStop);
        if (lastDeparture !== undefined && at < lastDeparture) {
            return {
                type: 'stopped',
                tripId,
                stationId: lastStop.stationId as string,
            };
        }
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
 * - 折り返し（findTurnarounds）は、前の列車が着いてから発時刻まで、発つ列車を始発駅に停車中（turnaround: true）として出す
 * - 出庫する列車は、発時刻の 3 分前から始発駅に停車中として出す（基地にいるあいだは出さない）
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
    const continuations = findContinuations(tripBlocks);
    const turnarounds = findTurnarounds(tripBlocks);

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
                continue;
            }
            // 種別変更・列番の付け替え: 終点に着いてから次の列番で発つまでは、前の列車を停車中として残す
            const continuation = continuations.get(trip.tripId);
            const last = timedStops(trip.times).at(-1);
            const nextFirst = continuation
                ? timedStops(continuation.times)[0]
                : undefined;
            if (
                last?.stationId != null &&
                nextFirst &&
                axisStationIds.has(last.stationId)
            ) {
                const arrival = resolveArrival(base, last);
                const departure = resolveDeparture(base, nextFirst);
                if (
                    arrival !== undefined &&
                    departure !== undefined &&
                    arrival <= at &&
                    at < departure
                ) {
                    positions.push({
                        type: 'stopped',
                        tripId: trip.tripId,
                        stationId: last.stationId,
                    });
                    continue;
                }
            }
            // 発時刻の前から始発駅に停車中として出す。
            // 折り返しは前の列車が着いてから、出庫は発時刻の DEPOT_OUT_LEAD_MS 前から
            const first = timedStops(trip.times)[0];
            if (
                first?.stationId != null &&
                axisStationIds.has(first.stationId)
            ) {
                const departure = resolveDeparture(base, first);
                const previous = turnarounds.get(trip.tripId);
                const previousLast = previous
                    ? timedStops(previous.times).at(-1)
                    : undefined;
                const appearsAt = previousLast
                    ? resolveArrival(base, previousLast)
                    : trip.depotOut && departure !== undefined
                      ? new Date(departure.getTime() - DEPOT_OUT_LEAD_MS)
                      : undefined;
                if (
                    appearsAt !== undefined &&
                    departure !== undefined &&
                    appearsAt <= at &&
                    at < departure
                ) {
                    positions.push({
                        type: 'stopped',
                        tripId: trip.tripId,
                        stationId: first.stationId,
                        ...(previousLast ? { turnaround: true as const } : {}),
                    });
                }
            }
        }
    }
    return positions;
}
