export interface OperationRouteDiagramColumnMetrics {
    /** 隣接駅間の距離（px） */
    columnWidth: number;
    /** 先頭駅までの左余白（px）。右余白も同じ */
    leftPad: number;
    /** SVG 全体の width（px） */
    width: number;
}

/**
 * 端の駅の外側に置く時刻（4 桁）と出庫○・入庫△が収まる余白。
 * 時刻は線の端の外側に出す（本番と同じ）ので、左右とも同じだけ要る。
 */
export const ROUTE_DIAGRAM_SIDE_PAD = 52;

/**
 * 列間隔の下限。これより狭くなる駅数・幅では、図をカードの中で横にスクロールさせる。
 * 22px・30px は狭いと言われて 40px にした経緯がある（99 文書追補 7・8）。
 */
export const ROUTE_DIAGRAM_MIN_COLUMN_WIDTH = 40;

/**
 * 表示駅数と使える幅から列間隔を決める純関数。
 *
 * 駅の列はカードの幅いっぱいに広げる（本番と同じ）。幅が足りず列間隔が
 * 下限を割るときだけ、下限で並べて使える幅を超えさせる。
 */
export function computeColumnMetrics(
    stationCount: number,
    availableWidth: number,
): OperationRouteDiagramColumnMetrics {
    const width = Math.max(availableWidth, 0);

    if (stationCount <= 1) {
        return { columnWidth: 0, leftPad: ROUTE_DIAGRAM_SIDE_PAD, width };
    }

    const gaps = stationCount - 1;
    const columnWidth = Math.max(
        ROUTE_DIAGRAM_MIN_COLUMN_WIDTH,
        (width - ROUTE_DIAGRAM_SIDE_PAD * 2) / gaps,
    );

    return {
        columnWidth,
        leftPad: ROUTE_DIAGRAM_SIDE_PAD,
        width: ROUTE_DIAGRAM_SIDE_PAD * 2 + columnWidth * gaps,
    };
}
