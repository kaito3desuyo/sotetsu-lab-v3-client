import { StationAxis } from 'src/app/shared/diagram-scale';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { timedStops } from 'src/app/shared/train-position.util';
import { StationAxisObservation } from './fit-station-axis.util';
import { estimatePassingStops } from './estimate-passing-times.util';
import {
    TripDiagramConnector,
    TripDiagramDepotMark,
    TripDiagramLine,
    TripDiagramPoint,
    TripDiagramStopLabel,
    TripDiagramThroughLabel,
    buildOccurrenceIndices,
    buildPassingStationIdsByPairIndex,
    resolveArrival,
    resolveDeparture,
    resolveStopOccurrences,
    minuteText,
    toDiagramMinute,
} from './build-trip-diagram-line.util';

/** buildMergedStops が各停車に付ける所有権（どの trips[] index の線に属すか）。 */
type ChainStopOwner = {
    /** 着の点の持ち主（trips のインデックス）。 */
    arrTripIndex: number;
    /** 発の点・以降の持ち主（trips のインデックス）。継走のつなぎ目駅だけ arrTripIndex と異なる。 */
    depTripIndex: number;
};

/**
 * 続きの順に並んだ trips の times を 1 本の停車列につなげる。
 *
 * つなぎ目の駅 X（前の列車の最後の停車＝次の列車の最初の停車、findContinuations の
 * 契約により必ず同じ駅）は 1 つの停車にまとめる: 着は前の列車の着、発は次の列車の発。
 * その 1 停車の所有権は着＝前の列車（arrTripIndex）・発＝次の列車（depTripIndex）に割れる。
 *
 * stopSequence は trips をまたぐと比較できない（列車ごとに 1 から振り直されるため）ので、
 * つなげた列の並び位置（0 始まりの連番）で振り直す。これにより
 * collectPassingStationIdsBetween 等（build-trip-diagram-line.util.ts 側）の
 * 既存ロジックをそのまま流用できる。
 */
function buildMergedStops(trips: readonly TripDetailsDto[]): {
    allStops: TimeDetailsDto[];
    ownerByStop: Map<TimeDetailsDto, ChainStopOwner>;
} {
    const allStops: TimeDetailsDto[] = [];
    const ownerByStop = new Map<TimeDetailsDto, ChainStopOwner>();

    trips.forEach((trip, tripIndex) => {
        const sorted = [...(trip.times ?? [])].sort(
            (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
        );
        sorted.forEach((stop, idxInTrip) => {
            if (tripIndex > 0 && idxInTrip === 0 && allStops.length > 0) {
                const prev = allStops[allStops.length - 1];
                const merged: TimeDetailsDto = {
                    ...prev,
                    departureTime: stop.departureTime,
                    departureDays: stop.departureDays,
                };
                allStops[allStops.length - 1] = merged;
                const prevOwner = ownerByStop.get(prev);
                ownerByStop.delete(prev);
                ownerByStop.set(merged, {
                    arrTripIndex: prevOwner?.arrTripIndex ?? tripIndex - 1,
                    depTripIndex: tripIndex,
                });
                return;
            }
            const copy: TimeDetailsDto = { ...stop };
            allStops.push(copy);
            ownerByStop.set(copy, {
                arrTripIndex: tripIndex,
                depTripIndex: tripIndex,
            });
        });
    });

    allStops.forEach((stop, index) => {
        stop.stopSequence = index;
    });

    return { allStops, ownerByStop };
}

/** buildChainDiagramLines の中で列車（trips のインデックス）ごとに積み上げる状態。 */
type OwnerBuildState = {
    current: TripDiagramPoint[];
    segments: TripDiagramPoint[][];
    allPoints: TripDiagramPoint[];
    /** side 抜きの暫定ラベル（side は allPoints が出そろってから確定する）。 */
    stopLabels: Omit<TripDiagramStopLabel, 'side'>[];
    /** stopLabels[i] が指す点の allPoints 上のインデックス（side の判定に使う）。 */
    stopLabelPointIndices: number[];
    connectors: TripDiagramConnector[];
};

/**
 * Task 19: 停車分ラベルの上下判定。この点より後ろ（未来）で最初に y が変わる点を探し、
 * それが小さければ（＝これから上へ向かう）'below'、大きければ 'above'。横に伸びる停車の
 * 待避（y 不変）は方向を決めないため読み飛ばす。後ろに変化点が無い（つながりの最後の
 * ラベル）場合は前（過去）側で同じ判定をする: 手前の点の y がこの点より大きい
 * （＝下から上がってきた＝上りの流れ）なら、その流れを引き継いで 'below' とする。
 * 前後どちらにも変化点が無ければ（全点同じ y）従来どおり 'above'。
 */
function computeStopLabelSide(
    allPoints: readonly TripDiagramPoint[],
    pointIndex: number,
): 'above' | 'below' {
    const currentY = allPoints[pointIndex].y;
    for (let i = pointIndex + 1; i < allPoints.length; i++) {
        if (allPoints[i].y !== currentY) {
            return allPoints[i].y < currentY ? 'below' : 'above';
        }
    }
    for (let i = pointIndex - 1; i >= 0; i--) {
        if (allPoints[i].y !== currentY) {
            return allPoints[i].y > currentY ? 'below' : 'above';
        }
    }
    return 'above';
}

/**
 * 続きの順に並んだ列車（種別変更・列番変更で継走する 1 編成分。1 本だけでもよい）を、
 * つなげた 1 本の停車列として分岐駅の跳び・分断・直通先ラベルを解決したのち、
 * 列車ごとの TripDiagramLine へ切り分ける純関数。
 *
 * つなぎ目の駅 X の着の点までが前の列車、着の点から先（停車の横線・跳んだ先の
 * つなぎ線・発の行を含む）が次の列車の線になる。着の点は両方の列車の点列に
 * 重複して入る（同じ座標を共有することで見た目が 1 本につながる）。
 */
export function buildChainDiagramLines(params: {
    /** 続きの順に並んだ列車（1 本だけでもよい） */
    trips: readonly TripDetailsDto[];
    axis: StationAxis;
    axisStationIds: ReadonlySet<string>;
    base: Date;
    stationNameById: ReadonlyMap<string, string>;
    /**
     * 隣り合う 2 駅の標準の運転時間（buildStandardRunMinutes）。渡したときだけ、
     * 線が切れる区間（分断）の途中にある時刻の空の通過駅を推測で埋めて描き直す。
     */
    standardRunMinutes?: ReadonlyMap<string, number>;
}): TripDiagramLine[] {
    const {
        trips,
        axis,
        axisStationIds,
        base,
        stationNameById,
        standardRunMinutes,
    } = params;
    if (trips.length === 0) {
        return [];
    }

    const { allStops, ownerByStop } = buildMergedStops(trips);
    const stopsOnAxis = allStops.filter(
        (t) =>
            t.stationId != null &&
            axisStationIds.has(t.stationId) &&
            // 発着とも欠落（null/undefined）の通過駅は除外する。
            (t.arrivalTime != null || t.departureTime != null),
    );

    if (stopsOnAxis.length < 2) {
        return [];
    }

    const axisStationOrder = axis.map((entry) => entry.stationId);
    const occurrenceIndices = buildOccurrenceIndices(axisStationOrder);
    const resolve = (stops: readonly TimeDetailsDto[]) =>
        resolveStopOccurrences(
            stops,
            occurrenceIndices,
            axisStationOrder,
            buildPassingStationIdsByPairIndex(allStops, stops),
            axis,
            base,
        );

    let { resolved: resolvedStops, connectors: internalConnectors } =
        resolve(stopsOnAxis);

    // 線が切れる区間（分断）の途中に時刻の空の通過駅があれば、推測で埋めて解き直す
    // （例: 二俣川→羽沢横浜国大の回送。西谷に時刻が無いと分岐駅で行を跳べない）。
    // 推測した停車には分の字を付けない。
    const estimatedStops = new Set<TimeDetailsDto>();
    if (standardRunMinutes !== undefined) {
        const indexInAxisStops = new Map(
            stopsOnAxis.map((stop, index) => [stop, index]),
        );
        const additions: TimeDetailsDto[] = [];
        for (const entry of resolvedStops) {
            const k = indexInAxisStops.get(entry.stop);
            if (
                entry.role !== 'both' ||
                !entry.newSegment ||
                k === undefined ||
                k === 0
            ) {
                continue;
            }
            const from = stopsOnAxis[k - 1];
            const to = entry.stop;
            const fromSeq = from.stopSequence ?? 0;
            const toSeq = to.stopSequence ?? 0;
            const between = allStops.filter(
                (t) =>
                    (t.stopSequence ?? 0) > fromSeq &&
                    (t.stopSequence ?? 0) < toSeq &&
                    t.stationId != null &&
                    axisStationIds.has(t.stationId) &&
                    t.arrivalTime == null &&
                    t.departureTime == null,
            );
            const estimated = estimatePassingStops({
                from,
                to,
                between,
                standardRunMinutes,
                base,
            });
            estimated.forEach((copy, index) => {
                const owner = ownerByStop.get(between[index]);
                if (owner) {
                    ownerByStop.set(copy, owner);
                }
                estimatedStops.add(copy);
                additions.push(copy);
            });
        }
        if (additions.length > 0) {
            const augmented = [...stopsOnAxis, ...additions].sort(
                (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
            );
            ({ resolved: resolvedStops, connectors: internalConnectors } =
                resolve(augmented));
        }
    }

    const stateByOwner = new Map<number, OwnerBuildState>();
    const stateOf = (owner: number): OwnerBuildState => {
        let state = stateByOwner.get(owner);
        if (!state) {
            state = {
                current: [],
                segments: [],
                allPoints: [],
                stopLabels: [],
                stopLabelPointIndices: [],
                connectors: [],
            };
            stateByOwner.set(owner, state);
        }
        return state;
    };
    const closeSegment = (owner: number): void => {
        const state = stateOf(owner);
        if (state.current.length > 0) {
            state.segments.push(state.current);
            state.current = [];
        }
    };
    const pushPoint = (owner: number, point: TripDiagramPoint): void => {
        const state = stateOf(owner);
        state.current.push(point);
        state.allPoints.push(point);
    };

    const labeledStops = new Set<TimeDetailsDto>();

    for (const resolvedStop of resolvedStops) {
        const stop = resolvedStop.stop;
        const owner = ownerByStop.get(stop);
        if (!owner) {
            continue;
        }
        const y = axis[resolvedStop.axisIndex].y;
        const arrival = resolveArrival(base, stop);
        const departure = resolveDeparture(base, stop);
        const isBoundary = owner.arrTripIndex !== owner.depTripIndex;

        if (resolvedStop.role === 'both') {
            if (resolvedStop.newSegment) {
                closeSegment(owner.arrTripIndex);
            }
            if (isBoundary) {
                // 次の列車はここから始まる（未着手のはずだが、念のため明示的に閉じる）。
                closeSegment(owner.depTripIndex);
            }
            if (arrival !== undefined) {
                const point = { minute: toDiagramMinute(base, arrival), y };
                pushPoint(owner.arrTripIndex, point);
                if (isBoundary) {
                    // つなぎ目の着の点は次の列車の線にも重複して入れる（共有点）。
                    pushPoint(owner.depTripIndex, point);
                }
            }
            if (
                departure !== undefined &&
                (arrival === undefined ||
                    departure.getTime() !== arrival.getTime())
            ) {
                const point = { minute: toDiagramMinute(base, departure), y };
                pushPoint(owner.depTripIndex, point);
            }
        } else {
            // role === 'jumpDeparture'（駅で行を跳んだ先）。arr(i) 側と同じ
            // 停車の着・発の点をもう一度打つ（横線2本の矩形にする）。
            // つなぎ目でも常に次の列車の所有にする（前の列車とは共有しない）。
            if (resolvedStop.newSegment) {
                closeSegment(owner.depTripIndex);
            }
            if (arrival !== undefined) {
                pushPoint(owner.depTripIndex, {
                    minute: toDiagramMinute(base, arrival),
                    y,
                });
            }
            if (
                departure !== undefined &&
                (arrival === undefined ||
                    departure.getTime() !== arrival.getTime())
            ) {
                pushPoint(owner.depTripIndex, {
                    minute: toDiagramMinute(base, departure),
                    y,
                });
            }
        }

        // 接続駅で同じ停車を別の位置に描き直したときは、字を二重に付けない
        const labelTime = stop.departureTime ?? stop.arrivalTime;
        const labelAt = departure ?? arrival;
        if (
            !labeledStops.has(stop) &&
            !estimatedStops.has(stop) &&
            labelTime != null &&
            labelAt !== undefined
        ) {
            labeledStops.add(stop);
            const labelOwner =
                departure !== undefined
                    ? owner.depTripIndex
                    : owner.arrTripIndex;
            const ownerState = stateOf(labelOwner);
            ownerState.stopLabels.push({
                minute: toDiagramMinute(base, labelAt),
                y,
                text: minuteText(labelTime),
            });
            // ラベルの直前に打った点（同じ停車の着 or 発）が、このラベルが指す点になる。
            ownerState.stopLabelPointIndices.push(
                ownerState.allPoints.length - 1,
            );
        }
    }

    for (const owner of stateByOwner.keys()) {
        closeSegment(owner);
    }

    for (const connector of internalConnectors) {
        const owner = ownerByStop.get(connector.stop);
        const ownerIndex = owner ? owner.depTripIndex : 0;
        stateOf(ownerIndex).connectors.push({
            minute: connector.minute,
            fromY: connector.fromY,
            toY: connector.toY,
        });
    }

    // 直通先ラベル: つなげた停車列全体の最初・最後だけで判定する（途中のつなぎ目には付けない）。
    const firstOnAxisSeq = stopsOnAxis[0].stopSequence ?? 0;
    const lastOnAxisSeq = stopsOnAxis[stopsOnAxis.length - 1].stopSequence ?? 0;
    const hasMoreBefore = allStops.some(
        (t) => (t.stopSequence ?? 0) < firstOnAxisSeq,
    );
    const hasMoreAfter = allStops.some(
        (t) => (t.stopSequence ?? 0) > lastOnAxisSeq,
    );

    // fix (task-15): 直通先・直通元ラベルは、つながりの中で実際に線を持つ最初・最後の
    // trip に付ける。末尾（または先頭）の trip が軸に載る点を1つも持たない（他社線内で
    // 軸から外れて終わる/始まる）と、trips.length-1（または0）に固定していた旧ロジックでは
    // その trip の線自体が作られず、ラベルが丸ごと消えていた。
    const wouldProduceLine = (index: number): boolean => {
        const state = stateByOwner.get(index);
        if (!state) {
            return false;
        }
        const filteredSegments = state.segments.filter(
            (segment) => segment.length >= 2,
        );
        return state.allPoints.length >= 2 && filteredSegments.length > 0;
    };
    let firstDrawnIndex = -1;
    let lastDrawnIndex = -1;
    trips.forEach((_, index) => {
        if (wouldProduceLine(index)) {
            if (firstDrawnIndex === -1) {
                firstDrawnIndex = index;
            }
            lastDrawnIndex = index;
        }
    });

    const lines: TripDiagramLine[] = [];
    trips.forEach((trip, index) => {
        if (trip.tripId === undefined) {
            return;
        }
        const state = stateByOwner.get(index);
        if (!state) {
            return;
        }
        const filteredSegments = state.segments.filter(
            (segment) => segment.length >= 2,
        );
        if (state.allPoints.length < 2 || filteredSegments.length === 0) {
            return;
        }

        const throughLabels: TripDiagramThroughLabel[] = [];
        if (index === firstDrawnIndex && hasMoreBefore) {
            const originId = allStops[0]?.stationId;
            const originName = originId
                ? stationNameById.get(originId)
                : undefined;
            if (originName) {
                const firstPoint = state.allPoints[0];
                throughLabels.push({
                    minute: firstPoint.minute,
                    y: firstPoint.y,
                    text: `${originName} →`,
                    anchor: 'end',
                });
            }
        }
        if (index === lastDrawnIndex && hasMoreAfter) {
            const destinationId = allStops[allStops.length - 1]?.stationId;
            const destinationName = destinationId
                ? stationNameById.get(destinationId)
                : undefined;
            if (destinationName) {
                const lastPoint = state.allPoints[state.allPoints.length - 1];
                throughLabels.push({
                    minute: lastPoint.minute,
                    y: lastPoint.y,
                    text: `→ ${destinationName}`,
                    anchor: 'start',
                });
            }
        }

        // Task 14: 入庫・出庫の印。出庫（◯）はつながりの先頭列車の最初の点、
        // 入庫（△）はつながりの末尾列車の最後の点にだけ置く（折り返しの代わり）。
        // 追加指示: 他線直通で trip 自身の times が軸の外まで続く場合、
        // state.allPoints は軸に載る区間だけ（＝実際の最初/最後の停車点ではない）
        // なので、trip 自身の最初/最後の時刻のある停車が軸上に無ければ印は置かない
        // （軸の外の入出庫を、軸の切れ目の駅に誤って表示しないため）。
        const depotMarks: TripDiagramDepotMark[] = [];
        if (index === 0 && trip.depotOut) {
            const ownFirstStop = timedStops(trip.times)[0];
            if (
                ownFirstStop?.stationId &&
                axisStationIds.has(ownFirstStop.stationId)
            ) {
                const firstPoint = state.allPoints[0];
                depotMarks.push({
                    kind: 'out',
                    minute: firstPoint.minute,
                    y: firstPoint.y,
                });
            }
        }
        if (index === trips.length - 1 && trip.depotIn) {
            const ownStops = timedStops(trip.times);
            const ownLastStop = ownStops[ownStops.length - 1];
            if (
                ownLastStop?.stationId &&
                axisStationIds.has(ownLastStop.stationId)
            ) {
                const lastPoint = state.allPoints[state.allPoints.length - 1];
                depotMarks.push({
                    kind: 'in',
                    minute: lastPoint.minute,
                    y: lastPoint.y,
                });
            }
        }

        const stopLabels: TripDiagramStopLabel[] = state.stopLabels.map(
            (label, i) => ({
                ...label,
                side: computeStopLabelSide(
                    state.allPoints,
                    state.stopLabelPointIndices[i],
                ),
            }),
        );

        lines.push({
            tripId: trip.tripId,
            tripNumber: trip.tripNumber ?? '',
            tripClassColor: trip.tripClass?.tripClassColor ?? '#8a8a8a',
            isDeadhead: trip.tripClassId === undefined,
            segments: filteredSegments,
            throughLabels,
            stopLabels,
            connectors: state.connectors,
            depotMarks,
            minMinute: Math.min(...state.allPoints.map((p) => p.minute)),
            maxMinute: Math.max(...state.allPoints.map((p) => p.minute)),
            isChainHead: index === 0,
        });
    });

    return lines;
}

/** 観測作りにだけ使う、y を持たない固定の日付（duration の計算に base の実値は関係しない）。 */
const OBSERVATION_EPOCH = new Date(2000, 0, 1);

/**
 * Task 13: fitStationAxisToTrips への観測（駅間の長さの最小二乗合わせ）を、
 * buildChainDiagramLines と同じ行の選び方（動的計画法。resolveStopOccurrences）から作る。
 *
 * 分断されていない隣り合う2停車（発の行 dep(i) → 着の行 arr(i+1)）ごとに1観測を作る。
 * 同じ駅の2つの行のあいだ（跳びの点線。resolveStopOccurrences の jumpDeparture）は、
 * その edge が常に newSegment=true になるため観測に含まれない（buildChainDiagramLines
 * 側の segment 分割と同じ判定をそのまま利用する）。
 *
 * 行の選び方（DP）は index だけで決まり y に依存しないため、この関数は y を使わない
 * （axisStationOrder の並びと stationId の対応だけで決まる）。呼び出し側は
 * 「初期の軸で行を選ぶ→観測→fitStationAxisToTrips で合わせた軸を作る→その軸で
 * buildChainDiagramLines を呼んで線を描く」の順で使う。
 */
export function buildChainStopIndexObservations(
    trips: readonly TripDetailsDto[],
    axisStationOrder: readonly string[],
): StationAxisObservation[] {
    if (trips.length === 0) {
        return [];
    }

    const { allStops, ownerByStop } = buildMergedStops(trips);
    const axisStationIds = new Set(axisStationOrder);
    const stopsOnAxis = allStops.filter(
        (t) =>
            t.stationId != null &&
            axisStationIds.has(t.stationId) &&
            (t.arrivalTime != null || t.departureTime != null),
    );
    if (stopsOnAxis.length < 2) {
        return [];
    }

    const occurrenceIndices = buildOccurrenceIndices(axisStationOrder);
    const passingStationIdsByPairIndex = buildPassingStationIdsByPairIndex(
        allStops,
        stopsOnAxis,
    );
    // resolveStopOccurrences は y（axis の y・base）を connector 座標にしか使わないため、
    // 観測作りではダミーの axis/base で十分（index の選び方にも所要分の計算にも影響しない）。
    const dummyAxis: StationAxis = axisStationOrder.map((stationId) => ({
        stationId,
        y: 0,
    }));
    const { resolved } = resolveStopOccurrences(
        stopsOnAxis,
        occurrenceIndices,
        axisStationOrder,
        passingStationIdsByPairIndex,
        dummyAxis,
        OBSERVATION_EPOCH,
    );

    const observations: StationAxisObservation[] = [];

    const departureMomentOf = (stop: TimeDetailsDto): Date | undefined =>
        resolveDeparture(OBSERVATION_EPOCH, stop) ??
        resolveArrival(OBSERVATION_EPOCH, stop);
    const arrivalMomentOf = (stop: TimeDetailsDto): Date | undefined =>
        resolveArrival(OBSERVATION_EPOCH, stop) ??
        resolveDeparture(OBSERVATION_EPOCH, stop);
    const depTripIndexOf = (stop: TimeDetailsDto): number | undefined =>
        ownerByStop.get(stop)?.depTripIndex;

    let prevDepIndex = resolved[0].axisIndex;
    let prevDepMoment = departureMomentOf(resolved[0].stop);
    let prevTripIndex = depTripIndexOf(resolved[0].stop);

    for (let i = 1; i < resolved.length; i++) {
        const entry = resolved[i];
        if (!entry.newSegment && prevDepMoment !== undefined) {
            const arrivalMoment = arrivalMomentOf(entry.stop);
            const tripId =
                prevTripIndex !== undefined
                    ? trips[prevTripIndex]?.tripId
                    : undefined;
            if (arrivalMoment !== undefined && tripId !== undefined) {
                const minutes =
                    (arrivalMoment.getTime() - prevDepMoment.getTime()) /
                    (60 * 1000);
                if (minutes > 0) {
                    observations.push({
                        tripId,
                        fromIndex: prevDepIndex,
                        toIndex: entry.axisIndex,
                        minutes,
                    });
                }
            }
        }
        prevDepIndex = entry.axisIndex;
        prevDepMoment = departureMomentOf(entry.stop);
        prevTripIndex = depTripIndexOf(entry.stop) ?? prevTripIndex;
    }

    return observations;
}
