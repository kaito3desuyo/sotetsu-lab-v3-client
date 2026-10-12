import {
    estimateTextWidth,
    OperationRouteDiagramBandLabels,
    placeLabel,
    ROUTE_DIAGRAM_OUTSIDE_STUB_HALF,
} from './operation-route-diagram-band-labels.util';
import { OperationRouteDiagramBandViewModel } from './operation-route-diagram-build-band-view-models.util';
import { OperationRouteDiagramColumnMetrics } from './operation-route-diagram-fit-columns.util';

/** 行の間隔。本番は 40px。線の上に種別チップを載せるぶん、上の行と離して 44px にする */
export const ROUTE_DIAGRAM_ROW_HEIGHT = 44;
/** 先頭行の線の y。線の上に載るラベルが上端で欠けない分 */
export const ROUTE_DIAGRAM_ROW_TOP_MARGIN = 32;

/** 種別チップ＋列番は線の上、区間の中央に置く。線からチップの中心までの高さ */
const LABEL_OFFSET = 17;
// 種別チップは app-trip-class-chip（md）と同じ寸法: 12px 太字・左右 6px・高さ 19px・角丸 4px
export const ROUTE_DIAGRAM_CHIP_FONT_SIZE = 12;
const CHIP_PAD_X = 6;
export const ROUTE_DIAGRAM_CHIP_HEIGHT = 19;
export const ROUTE_DIAGRAM_CHIP_RADIUS = 4;
export const ROUTE_DIAGRAM_TRIP_NUMBER_FONT_SIZE = 14;
const LABEL_GAP = 4;
/** 回送のチップと線の色（grey-500） */
export const ROUTE_DIAGRAM_NON_REVENUE_COLOR = '#9e9e9e';

export interface OperationRouteDiagramBandRow {
    tripOperationListId: string;
    tripBlockId?: string;
    tripDirection?: number;
    style: 'nonRevenue' | 'standard';
    /** 線の色。回送は灰 */
    color: string;
    /** 列番（「回」は除いた素の数字） */
    tripNumber: string;
    /** 種別名（系統の「（…）」は除去済み）。回送は「回送」 */
    tripClassName: string;
    /** 種別チップの塗り。旅客は種別色、回送は灰 */
    chipFill: string;
    chipX: number;
    chipY: number;
    chipWidth: number;
    chipTextX: number;
    tripNumberX: number;
    /** 種別チップと列番の中心の y */
    labelY: number;
    /** 線の y */
    centerY: number;
    leftX: number;
    rightX: number;
    leftTime?: string;
    rightTime?: string;
    /** 左端の外側に書く字（時刻。図の外の端は駅名＋時刻） */
    leftLabel?: string;
    /** 右端の外側に書く字 */
    rightLabel?: string;
    /** 左端の時刻の x（text-anchor="end"。左端の外側） */
    leftTimeX: number;
    /** 右端の時刻の x（text-anchor="start"。右端の外側） */
    rightTimeX: number;
    depotOut: boolean;
    depotIn: boolean;
    /** ○・△ を描くか（図の外の端には描かない） */
    depotOutMarker: boolean;
    depotInMarker: boolean;
    depotOutX: number;
    depotInX: number;
    /** 次の列車へ下ろす縦線の x。入庫する列車・最後の列車では無い */
    connectorX?: number;
    connectorY1?: number;
    connectorY2?: number;
    /** 縦線のグラデーションの id（列車ごとに一意） */
    connectorGradientId: string;
    /** 縦線のグラデーションの終わりの色（次の列車の色） */
    connectorEndColor?: string;
}

/**
 * 各列車は横線 1 本。両端の時刻は線の外側、種別チップ＋列番は線の上の中央。
 * 列車の着いた端から次の列車の線まで縦線を下ろして、一筆書きの階段にする。
 */
export function buildBandRows(
    viewModels: readonly OperationRouteDiagramBandViewModel[],
    bandLabels: readonly OperationRouteDiagramBandLabels[],
    metrics: OperationRouteDiagramColumnMetrics,
): OperationRouteDiagramBandRow[] {
    const xOf = (index: number) =>
        metrics.leftPad + index * metrics.columnWidth;

    const rows = viewModels.map((vm, index) => {
        const labels = bandLabels[index];
        const centerY =
            ROUTE_DIAGRAM_ROW_TOP_MARGIN + index * ROUTE_DIAGRAM_ROW_HEIGHT;
        const stubHalf = labels.stub ? ROUTE_DIAGRAM_OUTSIDE_STUB_HALF : 0;
        const leftX = xOf(vm.leftIndex) - stubHalf;
        const rightX = xOf(vm.rightIndex) + stubHalf;

        const leftTimeX = leftX - labels.leftGap;
        const rightTimeX = rightX + labels.rightGap;

        const isNonRevenue = vm.style === 'nonRevenue';
        const color = isNonRevenue ? ROUTE_DIAGRAM_NON_REVENUE_COLOR : vm.color;
        const chipWidth =
            estimateTextWidth(vm.tripClassName, ROUTE_DIAGRAM_CHIP_FONT_SIZE) +
            CHIP_PAD_X * 2;
        const labelWidth =
            chipWidth +
            LABEL_GAP +
            estimateTextWidth(
                vm.tripNumber,
                ROUTE_DIAGRAM_TRIP_NUMBER_FONT_SIZE,
            );
        const previous = viewModels[index - 1];
        const chipX = placeLabel(
            labelWidth,
            (leftX + rightX) / 2,
            previous && !previous.depotIn
                ? xOf(previous.depotInIndex)
                : undefined,
            metrics.width,
        );
        const labelY = centerY - LABEL_OFFSET;

        return {
            tripOperationListId: vm.tripOperationListId,
            tripBlockId: vm.tripBlockId,
            tripDirection: vm.tripDirection,
            style: vm.style,
            color,
            tripNumber: vm.tripNumber,
            tripClassName: vm.tripClassName,
            chipFill: color,
            chipX,
            chipY: labelY - ROUTE_DIAGRAM_CHIP_HEIGHT / 2,
            chipWidth,
            chipTextX: chipX + CHIP_PAD_X,
            tripNumberX: chipX + chipWidth + LABEL_GAP,
            labelY,
            centerY,
            leftX,
            rightX,
            leftTime: vm.leftTime,
            rightTime: vm.rightTime,
            leftLabel: labels.leftLabel,
            rightLabel: labels.rightLabel,
            leftTimeX,
            rightTimeX,
            depotOut: vm.depotOut,
            depotIn: vm.depotIn,
            depotOutMarker: vm.depotOutMarker,
            depotInMarker: vm.depotInMarker,
            depotOutX: xOf(vm.depotOutIndex),
            depotInX: xOf(vm.depotInIndex),
            connectorGradientId: `route-diagram-connector-gradient-${vm.tripOperationListId}`,
        };
    });

    // 縦線の座標は画面表示・画像出力で共通の、ヘッダー分を足す前の値で持つ
    // （足すのはテンプレート側。画像出力の SVG だけヘッダーの高さを足す）。
    return rows.map((row, index) => {
        const next = rows[index + 1];
        if (row.depotIn || !next) return row;

        return {
            ...row,
            connectorX: row.depotInX,
            connectorY1: row.centerY,
            connectorY2: next.centerY,
            connectorEndColor: next.color,
        };
    });
}
