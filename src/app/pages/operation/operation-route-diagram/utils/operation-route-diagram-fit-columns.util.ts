export interface OperationRouteDiagramColumnMetrics {
    /** 隣接駅間の距離（px） */
    columnWidth: number;
    /** 先頭駅までの左余白（px） */
    leftPad: number;
    /** SVG 全体の width（px）。駅数が多く MIN_COLUMN_WIDTH を割り込む場合のみ TARGET_WIDTH を超える */
    width: number;
}

/** G6（モック04）: 「390px に全経由駅をフィット」させる目標幅 */
export const ROUTE_DIAGRAM_TARGET_WIDTH = 390;
const LEFT_PAD = 24;
const RIGHT_PAD = 14;
/** 駅名の縦書き圧縮表示が判読可能な最小駅間隔 */
const MIN_COLUMN_WIDTH = 22;

/**
 * G6: 表示駅数から列間隔を算出する純関数。
 *
 * 通常駅数（目安 14 駅程度まで）では列間隔を均等に狭めて必ず
 * `ROUTE_DIAGRAM_TARGET_WIDTH`（390px）に収める（フィット優先）。
 * 駅数が極端に多く MIN_COLUMN_WIDTH を下回る場合のみ幅が
 * ROUTE_DIAGRAM_TARGET_WIDTH を超え、横スクロール/ピンチ拡大のフォールバックに委ねる。
 */
export function computeColumnMetrics(
    stationCount: number,
): OperationRouteDiagramColumnMetrics {
    if (stationCount <= 1) {
        return {
            columnWidth: 0,
            leftPad: LEFT_PAD,
            width: ROUTE_DIAGRAM_TARGET_WIDTH,
        };
    }

    const available = ROUTE_DIAGRAM_TARGET_WIDTH - LEFT_PAD - RIGHT_PAD;
    const gaps = stationCount - 1;
    const columnWidth = Math.max(MIN_COLUMN_WIDTH, available / gaps);
    const width = Math.max(
        ROUTE_DIAGRAM_TARGET_WIDTH,
        LEFT_PAD + RIGHT_PAD + columnWidth * gaps,
    );

    return { columnWidth, leftPad: LEFT_PAD, width };
}
