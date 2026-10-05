import { StationAxis, StationAxisEntry } from 'src/app/shared/diagram-scale';
import {
    TripDiagramLine,
    TripDiagramPoint,
} from './build-trip-diagram-line.util';
import { Turnback } from './find-turnbacks.util';
import {
    layoutTurnbackLinks,
    TurnbackLink,
} from './layout-turnback-links.util';

/** 行の y を突き合わせる際の丸め桁（layoutTurnbackLinks の ROW_KEY_PRECISION と揃える）。 */
const ROW_KEY_PRECISION = 3;

/** 広げた行・側・追加量（px）。レポート・デバッグ用。 */
export type WidenedGap = {
    /** 張り出しを持つ側の行の軸 index。 */
    rowIndex: number;
    side: 'up' | 'down';
    /** 元の隙間に対する追加量（px）。 */
    addedPx: number;
};

export type TurnbackClearanceResult = {
    /** 隙間を広げ、必要なら上下にパディングを足した駅軸。 */
    axis: StationAxis;
    /** y を新しい軸へ移し替えた（DP は再計算していない）列車の線。 */
    lines: TripDiagramLine[];
    /** 移し替えた線から引き直した⊐字リンク。 */
    links: TurnbackLink[];
    /** 広げた行の一覧（レポート用）。 */
    widenedGaps: WidenedGap[];
    /** 先頭行の上張り出しのために本体上部へ足した px（0 なら無し）。 */
    extraTopPx: number;
    /** 末尾行の下張り出しのために本体下部へ足した px（0 なら無し）。 */
    extraBottomPx: number;
};

function rowKey(y: number): string {
    return y.toFixed(ROW_KEY_PRECISION);
}

/**
 * 折り返しの⊐字リンクが隣の行・その行の線と衝突しないよう、駅軸の行間を必要なだけ
 * 広げる純関数（ユーザー指示: 「折り返し線がある行はある程度高さを確保しておいたほうがいい」）。
 *
 * 段の深さ（張り出しの深さ）は時間区間の重なりと張り出す側だけで決まり、行の y には
 * 依存しない（layoutTurnbackLinks 参照）ため、まず今の軸で線・リンクを作り、
 * 行（軸 index）・側ごとの最大深さ D を求めてから、隙間の必要量（D + minClearancePx）を
 * 計算する。その必要量をもとに軸を広げのみで作り直し（縮めない）、既に DP で組み立て済みの
 * 線の点（segments・connectors・stopLabels・throughLabels・depotMarks）の y を
 * 「元の行 y → 新しい行 y」の対応でそのまま移し替える（DP は再計算しない）。
 * 最後に、移し替えた線からリンクを引き直す（新しい行の y を基準にした張り出しにするため）。
 *
 * 先頭行が上へ、末尾行が下へ張り出す場合は隣の行が無いため、隙間を広げる代わりに
 * 本体の上下パディング（topPaddingPx・bottomPaddingPx）に対する不足分を
 * extraTopPx・extraBottomPx として返す（呼び出し側が bodyHeight に足す）。
 */
export function ensureTurnbackClearance(params: {
    axis: StationAxis;
    /** 今の axis で作った列車の線（DP 済み）。 */
    lines: readonly TripDiagramLine[];
    turnbacks: readonly Turnback[];
    /** 段の深さの刻み幅（px）。layoutTurnbackLinks にそのまま渡す。 */
    laneStepPx: number;
    /** 張り出しの深さに対して確保する最小の余白（px）。 */
    minClearancePx: number;
    /** 先頭行の上に既に確保されている余白（px）。 */
    topPaddingPx: number;
    /** 末尾行の下に既に確保されている余白（px）。 */
    bottomPaddingPx: number;
}): TurnbackClearanceResult {
    const {
        axis,
        lines,
        turnbacks,
        laneStepPx,
        minClearancePx,
        topPaddingPx,
        bottomPaddingPx,
    } = params;

    const n = axis.length;
    if (n === 0) {
        return {
            axis,
            lines: [...lines],
            links: [],
            widenedGaps: [],
            extraTopPx: 0,
            extraBottomPx: 0,
        };
    }

    const linesByTripId = new Map<string, TripDiagramLine>();
    for (const line of lines) {
        linesByTripId.set(line.tripId, line);
    }
    const initialLinks = layoutTurnbackLinks({
        turnbacks,
        linesByTripId,
        laneStepPx,
        axis,
    });

    const rowIndexByY = new Map<string, number>();
    axis.forEach((entry, index) => {
        rowIndexByY.set(rowKey(entry.y), index);
    });

    // 行 index → その側（上/下）の張り出しの最大深さ。
    const maxUpDepthByRow = new Map<number, number>();
    const maxDownDepthByRow = new Map<number, number>();
    for (const link of initialLinks) {
        // Task 18: points[0].y は分岐元の行（B）の y（分岐しない駅では着の行の y と同じ）。
        const rowY = link.points[0].y;
        const bulgeY = link.points[1].y;
        const rowIndex = rowIndexByY.get(rowKey(rowY));
        if (rowIndex === undefined) {
            continue;
        }
        const depth = Math.abs(bulgeY - rowY);
        const side: 'up' | 'down' = bulgeY < rowY ? 'up' : 'down';
        const map = side === 'up' ? maxUpDepthByRow : maxDownDepthByRow;
        map.set(rowIndex, Math.max(map.get(rowIndex) ?? 0, depth));
    }

    // gaps[i] = axis[i+1].y - axis[i].y （i: 0..n-2）。
    const gaps: number[] = [];
    for (let i = 0; i < n - 1; i++) {
        gaps.push(axis[i + 1].y - axis[i].y);
    }

    const widenedGaps: WidenedGap[] = [];
    const newGaps = gaps.map((gap, i) => {
        const downRequirement = maxDownDepthByRow.get(i);
        const upRequirement = maxUpDepthByRow.get(i + 1);
        let required = -Infinity;
        if (downRequirement !== undefined) {
            required = Math.max(required, downRequirement + minClearancePx);
        }
        if (upRequirement !== undefined) {
            required = Math.max(required, upRequirement + minClearancePx);
        }
        if (required === -Infinity || required <= gap) {
            return gap;
        }
        const addedPx = required - gap;
        if (downRequirement !== undefined) {
            widenedGaps.push({ rowIndex: i, side: 'down', addedPx });
        }
        if (upRequirement !== undefined) {
            widenedGaps.push({ rowIndex: i + 1, side: 'up', addedPx });
        }
        return required;
    });

    // 先頭行の上張り出し・末尾行の下張り出しは隣の行が無いため、本体の余白側で確保する。
    const firstUpDepth = maxUpDepthByRow.get(0);
    const extraTopPx =
        firstUpDepth !== undefined
            ? Math.max(0, firstUpDepth + minClearancePx - topPaddingPx)
            : 0;

    const lastDownDepth = maxDownDepthByRow.get(n - 1);
    const extraBottomPx =
        lastDownDepth !== undefined
            ? Math.max(0, lastDownDepth + minClearancePx - bottomPaddingPx)
            : 0;

    const newYs = new Array<number>(n);
    newYs[0] = axis[0].y + extraTopPx;
    for (let i = 1; i < n; i++) {
        newYs[i] = newYs[i - 1] + newGaps[i - 1];
    }

    const newAxis: StationAxisEntry[] = axis.map((entry, i) => ({
        stationId: entry.stationId,
        y: newYs[i],
        isDuplicate: entry.isDuplicate,
    }));

    const yMap = new Map<string, number>();
    axis.forEach((entry, i) => {
        yMap.set(rowKey(entry.y), newYs[i]);
    });
    const mapY = (y: number): number => yMap.get(rowKey(y)) ?? y;
    const remapPoint = (point: TripDiagramPoint): TripDiagramPoint => ({
        ...point,
        y: mapY(point.y),
    });

    const newLines: TripDiagramLine[] = lines.map((line) => ({
        ...line,
        segments: line.segments.map((segment) => segment.map(remapPoint)),
        throughLabels: line.throughLabels.map((label) => ({
            ...label,
            y: mapY(label.y),
        })),
        stopLabels: line.stopLabels.map((label) => ({
            ...label,
            y: mapY(label.y),
        })),
        connectors: line.connectors.map((connector) => ({
            ...connector,
            fromY: mapY(connector.fromY),
            toY: mapY(connector.toY),
        })),
        depotMarks: line.depotMarks.map((mark) => ({
            ...mark,
            y: mapY(mark.y),
        })),
    }));

    const newLinesByTripId = new Map<string, TripDiagramLine>();
    for (const line of newLines) {
        newLinesByTripId.set(line.tripId, line);
    }
    const finalLinks = layoutTurnbackLinks({
        turnbacks,
        linesByTripId: newLinesByTripId,
        laneStepPx,
        axis: newAxis,
    });

    return {
        axis: newAxis,
        lines: newLines,
        links: finalLinks,
        widenedGaps,
        extraTopPx,
        extraBottomPx,
    };
}
