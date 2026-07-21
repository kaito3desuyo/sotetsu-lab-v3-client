export interface OperationRouteDiagramColumnMetrics {
    /** 隣接駅間の距離（px） */
    columnWidth: number;
    /** 先頭駅までの左余白（px） */
    leftPad: number;
    /** SVG 全体の width（px）。駅数が少なく COLUMN_WIDTH での必要幅が
     * TARGET_WIDTH を下回る場合のみ TARGET_WIDTH が下限として使われる */
    width: number;
}

/** G6（モック04）: 駅数が少ない場合の最低限の見た目幅（下限。フィット目標ではない） */
export const ROUTE_DIAGRAM_TARGET_WIDTH = 390;
const LEFT_PAD = 24;
const RIGHT_PAD = 14;
// 99文書追補7 §2（P9-9）: 「390px に全駅をフィットさせる」方針は駅数が多いと
// 列間隔が窮屈になるという指摘（管理者実測: 17駅で22pxまで圧縮）を受けて撤回した。
// P9-2 で full-bleed 化済みのため横スクロール自体は既に許容されている
// （ROUTE_DIAGRAM_TARGET_WIDTH=390 はもう「フィットさせる目標幅」ではなく、
// 駅数が少ない場合の見た目の下限としてのみ使う）。列間隔は駅数に関わらず常にこの
// 固定値を使い、駅数が多ければ 390px を超えて横スクロールに委ねる。
// 99文書追補8 §1（P9-10）: P9-9 で 22→30 にしたがまだ狭いという指摘を受け、
// 30→40 にさらに拡大した（横スクロールは仕様として許容済み）。
const COLUMN_WIDTH = 40;

/**
 * G6/P9-10: 表示駅数から列間隔を算出する純関数。
 *
 * 列間隔は駅数に関わらず常に `COLUMN_WIDTH`（40px）の固定値を使う
 * （390px へのフィット優先はしない）。駅数が少なく必要幅が
 * `ROUTE_DIAGRAM_TARGET_WIDTH`（390px）を下回る場合のみ、見た目が
 * 極端に狭くならないよう 390px を下限として使う。
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

    const gaps = stationCount - 1;
    const width = Math.max(
        ROUTE_DIAGRAM_TARGET_WIDTH,
        LEFT_PAD + RIGHT_PAD + COLUMN_WIDTH * gaps,
    );

    return { columnWidth: COLUMN_WIDTH, leftPad: LEFT_PAD, width };
}
