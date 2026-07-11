import { toAbsoluteTime } from 'src/app/core/utils/railway-day';
import { StationAxis, timeToX } from 'src/app/shared/diagram-scale';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { RouteIdsByStation } from './build-route-ids-by-station.util';

export type TripDiagramPoint = { x: number; y: number };

export type TripDiagramThroughLabel = {
    x: number;
    y: number;
    text: string;
    /** ラベルの基点（'start' = 点の右側へ伸ばす / 'end' = 点の左側へ伸ばす） */
    anchor: 'start' | 'end';
};

export type TripDiagramLine = {
    tripId: string;
    tripNumber: string;
    tripClassColor: string;
    /** 回送（tripClass 未設定）は破線で表現する（既存慣行踏襲） */
    isDeadhead: boolean;
    /**
     * ポリライン用の点列群。列車が実際に経由しない軸区間（分岐路線を跨ぐ箇所）では
     * 線を分断するため、1 trip でも複数 segment になり得る。
     */
    segments: TripDiagramPoint[][];
    throughLabels: TripDiagramThroughLabel[];
};

const EMPTY_ROUTE_IDS: ReadonlySet<string> = new Set<string>();

/**
 * 連続停車ペア (from,to) が共通して属する routeId 集合（＝当該区間の所属路線）を求める。
 * 経由判定は trip 単位ではなくペア単位で行う: 直通列車は複数路線を跨ぐため、
 * 全停車駅にわたる積集合は空になり経由判定が全て無効化されてしまう
 * （経由しないブロックを線が直線横断する）。ペア単位ならその区間の所属路線で
 * 正しく判定できる。どちらかの駅の情報が無ければ空集合
 * （＝判定不能。呼び出し側は分断しない安全側に倒す）。
 */
function resolvePairRouteIds(
    fromStationId: string,
    toStationId: string,
    routeIdsByStation: RouteIdsByStation,
): ReadonlySet<string> {
    const fromRouteIds = routeIdsByStation.get(fromStationId);
    const toRouteIds = routeIdsByStation.get(toStationId);
    if (!fromRouteIds || !toRouteIds) {
        return EMPTY_ROUTE_IDS;
    }
    const result = new Set<string>();
    for (const id of fromRouteIds) {
        if (toRouteIds.has(id)) {
            result.add(id);
        }
    }
    return result;
}

/** 駅ID → 軸上の全 occurrence（インデックス）群。分岐駅は複数持ちうる。 */
function buildOccurrenceIndices(
    axisStationOrder: readonly string[],
): Map<string, number[]> {
    const map = new Map<string, number[]>();
    axisStationOrder.forEach((stationId, index) => {
        const list = map.get(stationId) ?? [];
        list.push(index);
        map.set(stationId, list);
    });
    return map;
}

/**
 * 軸上の2つのインデックス(a, b)の間（軸順で挟まる駅）に、
 * 当該区間の所属路線（pairRouteIds。resolvePairRouteIds 由来）に属さない駅
 * （他分岐の駅）が 1 つでもあれば true。
 * 所属路線が判定不能（pairRouteIds が空）な場合は分断しない。
 */
function hasInterloperBetween(
    a: number,
    b: number,
    axisStationOrder: readonly string[],
    routeIdsByStation: RouteIdsByStation,
    pairRouteIds: ReadonlySet<string>,
): boolean {
    if (pairRouteIds.size === 0) {
        return false;
    }
    const start = Math.min(a, b);
    const end = Math.max(a, b);

    for (let i = start + 1; i < end; i++) {
        const betweenStationId = axisStationOrder[i];
        if (betweenStationId === undefined) {
            continue;
        }
        const routeIds = routeIdsByStation.get(betweenStationId);
        if (!routeIds) {
            continue;
        }
        const onPairRoute = Array.from(routeIds).some((id) =>
            pairRouteIds.has(id),
        );
        if (!onPairRoute) {
            return true;
        }
    }
    return false;
}

type ResolvedStop = {
    stop: TimeDetailsDto;
    /** 採用した軸上の occurrence（インデックス）。 */
    axisIndex: number;
    /** true の場合、この stop から新しい segment を開始する（接続駅での分割を含む）。 */
    newSegment: boolean;
};

/**
 * 停車駅列を軸上の occurrence（複製された分岐駅を含む）へ解決する。
 *
 * 直前停車の occurrence を固定して次停車の最寄り occurrence を探し、経由しない
 * 他分岐駅を挟まずに繋がる組が見つかればそのまま連結する。見つからない場合は、
 * 直前停車側の occurrence も含めて総当たりし、繋がる組（a, b）があれば
 * 直前停車を occurrence a で再描画（複製）した上で新しい segment を開始する
 * （＝接続駅の二重表示）。どの組でも繋がらなければ、経由路線判定不能時と同様に
 * 新しい segment を開始する（従来の分断挙動を維持）。
 *
 * 経由判定は連続停車ペア単位（resolvePairRouteIds）で行う。直通列車でも
 * 各駅間はその区間の所属路線で判定されるため、経由しないブロックを横切る組は
 * 棄却され、複製 occurrence への付け替え・分断が正しく機能する。
 */
function resolveStopOccurrences(
    stopsOnAxis: readonly TimeDetailsDto[],
    occurrenceIndices: ReadonlyMap<string, number[]>,
    axisStationOrder: readonly string[],
    routeIdsByStation: RouteIdsByStation,
): ResolvedStop[] {
    const resolved: ResolvedStop[] = [];

    const firstStationId = stopsOnAxis[0].stationId as string;
    const firstCandidates = occurrenceIndices.get(firstStationId) ?? [0];
    resolved.push({
        stop: stopsOnAxis[0],
        axisIndex: firstCandidates[0],
        newSegment: false,
    });

    for (let i = 1; i < stopsOnAxis.length; i++) {
        const prevResolved = resolved[resolved.length - 1];
        const prevStop = prevResolved.stop;
        const curStop = stopsOnAxis[i];
        const curCandidates =
            occurrenceIndices.get(curStop.stationId as string) ?? [];
        const pairRouteIds = resolvePairRouteIds(
            prevStop.stationId as string,
            curStop.stationId as string,
            routeIdsByStation,
        );

        let nearest: number | undefined;
        for (const b of curCandidates) {
            if (
                hasInterloperBetween(
                    prevResolved.axisIndex,
                    b,
                    axisStationOrder,
                    routeIdsByStation,
                    pairRouteIds,
                )
            ) {
                continue;
            }
            if (
                nearest === undefined ||
                Math.abs(b - prevResolved.axisIndex) <
                    Math.abs(nearest - prevResolved.axisIndex)
            ) {
                nearest = b;
            }
        }

        if (nearest !== undefined) {
            resolved.push({ stop: curStop, axisIndex: nearest, newSegment: false });
            continue;
        }

        // 直前停車の occurrence 固定では繋がらない → 直前停車側も含めて総当たりする。
        const prevCandidates =
            occurrenceIndices.get(prevStop.stationId as string) ?? [];
        let best: { a: number; b: number } | undefined;
        for (const a of prevCandidates) {
            for (const b of curCandidates) {
                if (
                    hasInterloperBetween(
                        a,
                        b,
                        axisStationOrder,
                        routeIdsByStation,
                        pairRouteIds,
                    )
                ) {
                    continue;
                }
                if (best === undefined || Math.abs(b - a) < Math.abs(best.b - best.a)) {
                    best = { a, b };
                }
            }
        }

        if (best !== undefined) {
            // 直前停車を別 occurrence で再描画（複製）し、新 segment を開始する。
            resolved.push({ stop: prevStop, axisIndex: best.a, newSegment: true });
            resolved.push({ stop: curStop, axisIndex: best.b, newSegment: false });
            continue;
        }

        // どの組でも他分岐駅を挟む場合は、従来どおり分断する。
        resolved.push({
            stop: curStop,
            axisIndex: curCandidates[0] ?? prevResolved.axisIndex,
            newSegment: true,
        });
    }

    return resolved;
}

/**
 * trip times の days は 1-based（day 1 = 営業日当日、day 2 = 24 時超えの翌日分）で格納される。
 * toAbsoluteTime は 0 始まりの日オフセットのため -1 する。欠落時は day 1（オフセット 0）とみなす。
 */
function dayOffset(days: number | null | undefined): number {
    return (days ?? 1) - 1;
}

function resolveArrival(base: Date, time: TimeDetailsDto): Date | undefined {
    // API の欠落時刻は null で来る（undefined ではない）ため == null で両方を捉える。
    const value = time.arrivalTime ?? time.departureTime;
    if (value == null) {
        return undefined;
    }
    return toAbsoluteTime(base, dayOffset(time.arrivalDays ?? time.departureDays), value);
}

function resolveDeparture(base: Date, time: TimeDetailsDto): Date | undefined {
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

function minutesBetween(from: Date, to: Date): number {
    return (to.getTime() - from.getTime()) / (60 * 1000);
}

/**
 * 1 trip 分のダイヤグラム線（SVG polyline 用の点列）を算出する純関数。
 *
 * - 停車点（駅軸上のみ）を stopSequence 順に走査し、着時刻・発時刻それぞれに点を打つ。
 *   同駅で着 x < 発 x となるため、そのまま水平線分（停車・待避）が現れる
 * - 駅軸に存在しない stopSequence（路線を跨ぐ列車の他路線区間）は捨てる。
 *   軸の先頭/末尾より外側に停車点が残っている場合は「端点ラベル」を生成する
 * - 描画に使う時刻は `toAbsoluteTime`（鉄道日ユーティリティ）で実体化するため、
 *   24 時超え表記・日またぎも正しく扱える
 */
export function buildTripDiagramLine(params: {
    trip: TripDetailsDto;
    axis: StationAxis;
    axisStationIds: ReadonlySet<string>;
    /** 駅ID → 所属routeId集合（選択路線に限定。build-route-ids-by-station.util 由来）。 */
    routeIdsByStation: RouteIdsByStation;
    base: Date;
    windowStart: Date;
    pxPerMinute: number;
    axisPxPerMinute: number;
    headerHeight: number;
}): TripDiagramLine | undefined {
    const {
        trip,
        axis,
        axisStationIds,
        routeIdsByStation,
        base,
        windowStart,
        pxPerMinute,
        axisPxPerMinute,
        headerHeight,
    } = params;

    if (trip.tripId === undefined) {
        return undefined;
    }

    const allStops = [...(trip.times ?? [])].sort(
        (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
    );
    const stopsOnAxis = allStops.filter(
        (t) =>
            t.stationId != null &&
            axisStationIds.has(t.stationId) &&
            // 発着とも欠落（null/undefined）の通過駅は除外する。
            (t.arrivalTime != null || t.departureTime != null),
    );

    if (stopsOnAxis.length < 2) {
        return undefined;
    }

    // 網羅駅軸の並び順（stationId。分岐駅は複製された occurrence を複数持つ）。
    const axisStationOrder = axis.map((entry) => entry.stationId);
    const occurrenceIndices = buildOccurrenceIndices(axisStationOrder);

    const resolvedStops = resolveStopOccurrences(
        stopsOnAxis,
        occurrenceIndices,
        axisStationOrder,
        routeIdsByStation,
    );

    const allPoints: TripDiagramPoint[] = [];
    const segments: TripDiagramPoint[][] = [];
    let currentSegment: TripDiagramPoint[] = [];

    for (const resolvedStop of resolvedStops) {
        if (resolvedStop.newSegment && currentSegment.length > 0) {
            segments.push(currentSegment);
            currentSegment = [];
        }

        const y = headerHeight + axis[resolvedStop.axisIndex].y * axisPxPerMinute;
        const arrival = resolveArrival(base, resolvedStop.stop);
        const departure = resolveDeparture(base, resolvedStop.stop);

        if (arrival !== undefined) {
            const point = {
                x: timeToX(minutesBetween(windowStart, arrival), pxPerMinute),
                y,
            };
            currentSegment.push(point);
            allPoints.push(point);
        }
        if (
            departure !== undefined &&
            (arrival === undefined || departure.getTime() !== arrival.getTime())
        ) {
            const point = {
                x: timeToX(minutesBetween(windowStart, departure), pxPerMinute),
                y,
            };
            currentSegment.push(point);
            allPoints.push(point);
        }
    }
    if (currentSegment.length > 0) {
        segments.push(currentSegment);
    }

    if (allPoints.length < 2) {
        return undefined;
    }

    const filteredSegments = segments.filter((segment) => segment.length >= 2);

    if (filteredSegments.length === 0) {
        return undefined;
    }

    const throughLabels: TripDiagramThroughLabel[] = [];
    const firstOnAxisSeq = stopsOnAxis[0].stopSequence ?? 0;
    const lastOnAxisSeq = stopsOnAxis[stopsOnAxis.length - 1].stopSequence ?? 0;

    const hasMoreBefore = allStops.some(
        (t) => (t.stopSequence ?? 0) < firstOnAxisSeq,
    );
    const hasMoreAfter = allStops.some(
        (t) => (t.stopSequence ?? 0) > lastOnAxisSeq,
    );

    const firstPoint = allPoints[0];
    const lastPoint = allPoints[allPoints.length - 1];

    if (hasMoreBefore) {
        const originName = allStops[0]?.station?.stationName;
        if (originName) {
            throughLabels.push({
                x: firstPoint.x,
                y: firstPoint.y,
                text: `${originName} →`,
                anchor: 'end',
            });
        }
    }
    if (hasMoreAfter) {
        const destinationName = allStops[allStops.length - 1]?.station
            ?.stationName;
        if (destinationName) {
            throughLabels.push({
                x: lastPoint.x,
                y: lastPoint.y,
                text: `→ ${destinationName}`,
                anchor: 'start',
            });
        }
    }

    return {
        tripId: trip.tripId,
        tripNumber: trip.tripNumber ?? '',
        tripClassColor: trip.tripClass?.tripClassColor ?? '#8a8a8a',
        isDeadhead: trip.tripClassId === undefined,
        segments: filteredSegments,
        throughLabels,
    };
}
