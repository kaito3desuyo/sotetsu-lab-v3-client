import { StationAxis } from 'src/app/shared/diagram-scale';
import { Turnback } from './find-turnbacks.util';
import {
    TripDiagramLine,
    TripDiagramPoint,
} from './build-trip-diagram-line.util';

export type TurnbackLink = {
    arrivingTripId: string;
    departingTripId: string;
    /**
     * SVG の点（分と y）。コの字の 4 点はすべて**分岐元の行**（B）の y に乗る:
     * 分岐元の行 → 張り出し → 張り出し → (発の分, 分岐元の行の y)。
     * 分岐しない駅（軸に 1 回しか出ない）では B = 着の行の y なので、
     * これまでどおり着の行に乗る。
     */
    points: TripDiagramPoint[];
    /** 発車する列車の色 */
    color: string;
    minMinute: number;
    maxMinute: number;
    /**
     * Task 18: 分岐元の行（B）と着・発それぞれの点の y が異なる（複製行をまたぐ）
     * ときだけ持つ、縦のつなぎ線（分岐駅の点線（connector）と同じ見た目）。
     * 着側・発側で最大 2 本（0〜2 個）。
     */
    connectors: { minute: number; fromY: number; toY: number }[];
};

/** 同じ駅の行としてまとめる際の y の丸め桁（浮動小数の誤差吸収）。 */
const ROW_KEY_PRECISION = 3;

type PreparedLink = {
    turnback: Turnback;
    arrivalPoint: TripDiagramPoint;
    departurePoint: TripDiagramPoint;
    /** 分岐元の行（B）の y。分岐しない駅では着の点の y と同じ。 */
    originY: number;
    side: 'up' | 'down';
    color: string;
};

function rowKey(y: number): string {
    return y.toFixed(ROW_KEY_PRECISION);
}

function sameRow(a: number, b: number): boolean {
    return rowKey(a) === rowKey(b);
}

/**
 * stationId → 分岐元の行（非複製行。insertJunctionDuplicates が挿入していない、
 * base 由来の行）の y。分岐しない駅（軸に 1 回しか出ない駅）もその唯一の行の y になる。
 */
function buildOriginYByStationId(axis: StationAxis): Map<string, number> {
    const map = new Map<string, number>();
    for (const entry of axis) {
        if (entry.isDuplicate) {
            continue;
        }
        if (!map.has(entry.stationId)) {
            map.set(entry.stationId, entry.y);
        }
    }
    return map;
}

/** 軸上に 2 回以上登場する（＝分岐して複製行を持つ）stationId の集合。 */
function buildDuplicatedStationIds(axis: StationAxis): Set<string> {
    const counts = new Map<string, number>();
    for (const entry of axis) {
        counts.set(entry.stationId, (counts.get(entry.stationId) ?? 0) + 1);
    }
    const result = new Set<string>();
    for (const [stationId, count] of counts) {
        if (count > 1) {
            result.add(stationId);
        }
    }
    return result;
}

/**
 * 張り出す側（up/down）を決める。
 *
 * - 分岐しない駅（hasDuplicateRows=false）: これまでどおり、着く列車の線の
 *   最後から2番目の点の y と着の点の y の大小で決める
 *   （上から来たら下へ、下から来たら上へ、同じなら下へ）。
 * - 分岐駅（Task 18・コントローラ判断）: ⊐字を分岐元の行（B）に乗せるため、
 *   1) 発つ列車が B から発つなら、その次の点の側と反対（発が下へ進むなら上へ）。
 *   2) そうでなく着く列車が B に着くなら、従来どおり前の点の側と反対。
 *   3) どちらでもない（両端とも複製行）なら、着の行が B に対してどちら側にあるかと
 *      反対（着の行が下なら上へ）。同じ y なら下へ（フォールバック）。
 */
function determineBulgeSide(params: {
    hasDuplicateRows: boolean;
    originY: number;
    arrivalPoint: TripDiagramPoint;
    previousPoint: TripDiagramPoint;
    departurePoint: TripDiagramPoint;
    departureNextPoint: TripDiagramPoint | undefined;
}): 'up' | 'down' {
    const {
        hasDuplicateRows,
        originY,
        arrivalPoint,
        previousPoint,
        departurePoint,
        departureNextPoint,
    } = params;

    if (!hasDuplicateRows) {
        return previousPoint.y <= arrivalPoint.y ? 'down' : 'up';
    }

    const departsFromOrigin = sameRow(departurePoint.y, originY);
    if (departsFromOrigin && departureNextPoint !== undefined) {
        if (departureNextPoint.y > departurePoint.y) {
            return 'up';
        }
        if (departureNextPoint.y < departurePoint.y) {
            return 'down';
        }
        return 'down';
    }

    const arrivesAtOrigin = sameRow(arrivalPoint.y, originY);
    if (arrivesAtOrigin) {
        return previousPoint.y <= arrivalPoint.y ? 'down' : 'up';
    }

    if (arrivalPoint.y > originY) {
        return 'up';
    }
    if (arrivalPoint.y < originY) {
        return 'down';
    }
    return 'down';
}

/**
 * 折り返し（Turnback）を、両端の列車の線が実際に描かれているときだけ、
 * 重ならない⊐字のポリラインへレイアウトする純関数。
 *
 * - 着の点 = 着く列車の線の最後の点、発の点 = 発つ列車の線の最初の点
 *   （どちらも実際に描かれた座標。行が違っても構わない）。
 * - 張り出す側は determineBulgeSide を参照。
 * - 同じ「分岐元の行（B）」・同じ側の折り返しは、着の分の早い順に並べて
 *   区間グラフの彩色（重なるものは別の段）で深さを決める。
 * - Task 18（コントローラ判断）: 分岐駅（西谷・二俣川・かしわ台等）は軸に2回以上
 *   出現する（insertJunctionDuplicates による複製行）。この場合、⊐字は常に
 *   **分岐元の行（axis の isDuplicate が立っていない、base 由来の行）** に乗せる
 *   （着・発どちらが複製行にかかっていても）。分岐元の行の y と着・発それぞれの
 *   点の y が異なるときは、それぞれの分に分岐駅の点線（connector）と同じ見た目の
 *   縦のつなぎ線を持たせる（最大2本）。分岐しない駅では分岐元の行 = 着の行になるため、
 *   従来どおりの見た目になる。
 */
export function layoutTurnbackLinks(params: {
    turnbacks: readonly Turnback[];
    linesByTripId: ReadonlyMap<string, TripDiagramLine>;
    /** 段の深さの刻み幅（px）。段 k（0始まり）の深さ = (k + 1) × laneStepPx。 */
    laneStepPx: number;
    /** 分岐元の行（B）を判定するための駅軸（StationAxisEntry.isDuplicate を使う）。 */
    axis: StationAxis;
}): TurnbackLink[] {
    const { turnbacks, linesByTripId, laneStepPx, axis } = params;

    const originYByStationId = buildOriginYByStationId(axis);
    const duplicatedStationIds = buildDuplicatedStationIds(axis);
    const rowYsByStationId = new Map<string, Set<string>>();
    for (const entry of axis) {
        const ys = rowYsByStationId.get(entry.stationId) ?? new Set<string>();
        ys.add(rowKey(entry.y));
        rowYsByStationId.set(entry.stationId, ys);
    }

    const prepared: PreparedLink[] = [];
    for (const turnback of turnbacks) {
        const arrivingLine = linesByTripId.get(turnback.arrivingTripId);
        const departingLine = linesByTripId.get(turnback.departingTripId);
        if (!arrivingLine || !departingLine) {
            // 両端の線の両方が図にあるときだけ作る。
            continue;
        }

        const lastSegment =
            arrivingLine.segments[arrivingLine.segments.length - 1];
        const firstSegment = departingLine.segments[0];
        if (!lastSegment || lastSegment.length < 2 || !firstSegment?.length) {
            continue;
        }

        const arrivalPoint = lastSegment[lastSegment.length - 1];
        const departurePoint = firstSegment[0];
        // 着・発の点が折り返し駅の行に無い（線がその駅まで届いていない）なら作らない。
        const stationRowYs = rowYsByStationId.get(turnback.stationId);
        if (
            !stationRowYs?.has(rowKey(arrivalPoint.y)) ||
            !stationRowYs.has(rowKey(departurePoint.y))
        ) {
            continue;
        }
        // 張り出す側の判定には、着の点と高さの違う直前の点を使う（停車の横線は読み飛ばす）。
        const previousPoint =
            [...lastSegment]
                .slice(0, -1)
                .reverse()
                .find((point) => !sameRow(point.y, arrivalPoint.y)) ??
            lastSegment[lastSegment.length - 2];
        const departureNextPoint =
            firstSegment
                .slice(1)
                .find((point) => !sameRow(point.y, departurePoint.y)) ??
            (firstSegment.length > 1 ? firstSegment[1] : undefined);

        const hasDuplicateRows = duplicatedStationIds.has(turnback.stationId);
        const originY =
            originYByStationId.get(turnback.stationId) ?? arrivalPoint.y;

        const side = determineBulgeSide({
            hasDuplicateRows,
            originY,
            arrivalPoint,
            previousPoint,
            departurePoint,
            departureNextPoint,
        });

        prepared.push({
            turnback,
            arrivalPoint,
            departurePoint,
            originY,
            side,
            color: departingLine.tripClassColor,
        });
    }

    // 同じ分岐元の行（B）・同じ側でグルーピングし、区間グラフの彩色で段を決める。
    const groups = new Map<string, PreparedLink[]>();
    for (const link of prepared) {
        const groupKey = `${rowKey(link.originY)}:${link.side}`;
        const list = groups.get(groupKey) ?? [];
        list.push(link);
        groups.set(groupKey, list);
    }

    const depthByLink = new Map<PreparedLink, number>();
    for (const group of groups.values()) {
        const ordered = [...group].sort(
            (a, b) => a.arrivalPoint.minute - b.arrivalPoint.minute,
        );
        // 各段がこれまでに引き受けた区間の右端（分）。端が触れるのも重なりとみなすため、
        // 次の区間の開始が厳密にこれより後でなければその段は使えない。
        const laneEnds: number[] = [];
        for (const link of ordered) {
            const start = Math.min(
                link.arrivalPoint.minute,
                link.departurePoint.minute,
            );
            const end = Math.max(
                link.arrivalPoint.minute,
                link.departurePoint.minute,
            );
            let laneIndex = laneEnds.findIndex((laneEnd) => laneEnd < start);
            if (laneIndex === -1) {
                laneIndex = laneEnds.length;
                laneEnds.push(end);
            } else {
                laneEnds[laneIndex] = end;
            }
            depthByLink.set(link, (laneIndex + 1) * laneStepPx);
        }
    }

    return prepared.map((link) => {
        const depth = depthByLink.get(link) ?? laneStepPx;
        const originY = link.originY;
        const arrY = link.arrivalPoint.y;
        const depY = link.departurePoint.y;
        const bulgeY = link.side === 'down' ? originY + depth : originY - depth;
        const arrMinute = link.arrivalPoint.minute;
        const depMinute = link.departurePoint.minute;

        const connectors: { minute: number; fromY: number; toY: number }[] = [];
        if (!sameRow(arrY, originY)) {
            connectors.push({ minute: arrMinute, fromY: arrY, toY: originY });
        }
        if (!sameRow(depY, originY)) {
            connectors.push({ minute: depMinute, fromY: originY, toY: depY });
        }

        return {
            arrivingTripId: link.turnback.arrivingTripId,
            departingTripId: link.turnback.departingTripId,
            points: [
                { minute: arrMinute, y: originY },
                { minute: arrMinute, y: bulgeY },
                { minute: depMinute, y: bulgeY },
                { minute: depMinute, y: originY },
            ],
            color: link.color,
            minMinute: Math.min(arrMinute, depMinute),
            maxMinute: Math.max(arrMinute, depMinute),
            connectors,
        };
    });
}
