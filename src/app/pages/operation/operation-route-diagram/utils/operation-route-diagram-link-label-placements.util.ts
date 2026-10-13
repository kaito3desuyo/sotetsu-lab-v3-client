import { ItineraryLinkLabels } from 'src/app/libs/operation/usecase/build-itinerary-link-labels.util';
import { estimateTextWidth } from './operation-route-diagram-band-labels.util';
import { OperationRouteDiagramBandRow } from './operation-route-diagram-build-band-rows.util';

/** 前後の運用の字の大きさ（種別チップの字と同じ） */
export const ROUTE_DIAGRAM_LINK_LABEL_FONT_SIZE = 12;
/** 点の中心から字の端までの横の離れ */
const SIDE_GAP = 6;
/** 線から字のベースラインまでの高さ（上に出すとき）。チップの高さ帯と別の行に収める */
const ABOVE_OFFSET = 10;
/** 線から字のベースラインまでの高さ（下に出すとき） */
const BELOW_OFFSET = 22;
/** 列番の字の幅の見積り（種別チップの右に付く） */
const TRIP_NUMBER_FONT_SIZE = 14;

export interface OperationRouteDiagramLinkLabelPlacement {
    key: string;
    text: string;
    x: number;
    y: number;
    anchor: 'start' | 'end';
}

interface Box {
    left: number;
    right: number;
}

/**
 * 前後・途中の運用の文言の置き場所を決める。絵の座標系（行の y・点の x）で返す。
 * - 「↓ 11K から」: 最初の列車の始点の上
 * - 「↓ 12K へ」: 最後の列車の終点の下
 * - 途中の「から」: その列車の始点の上（出庫の印があれば印の位置）
 * - 途中の「へ」: その列車の終点の下（入庫の印があれば印の位置）
 * 右にはみ出す・チップと重なるときは、点の反対側に回す。下に出す「へ」が次の行の
 * チップ・列番に重なるときは、反対側の横、点の上、チップの右の順に回す。
 */
export function buildLinkLabelPlacements(params: {
    rows: readonly OperationRouteDiagramBandRow[];
    tripIds: readonly string[];
    labels: ItineraryLinkLabels;
    width: number;
}): OperationRouteDiagramLinkLabelPlacement[] {
    const { rows, tripIds, labels, width } = params;
    const result: OperationRouteDiagramLinkLabelPlacement[] = [];
    if (!rows.length) return result;

    const chipBox = (row: OperationRouteDiagramBandRow): Box => ({
        left: row.chipX,
        right:
            row.tripNumberX +
            estimateTextWidth(row.tripNumber, TRIP_NUMBER_FONT_SIZE),
    });

    const place = (
        key: string,
        text: string,
        pointX: number,
        baseY: number,
        avoid: Box | null,
        preferred: 'start' | 'end',
        fallback?: { y: number; avoid: Box },
    ) => {
        const w = estimateTextWidth(text, ROUTE_DIAGRAM_LINK_LABEL_FONT_SIZE);
        const candidates = (
            preferred === 'start' ? ['start', 'end'] : ['end', 'start']
        ) as ('start' | 'end')[];
        const boxOf = (anchor: 'start' | 'end'): Box =>
            anchor === 'start'
                ? { left: pointX - SIDE_GAP, right: pointX - SIDE_GAP + w }
                : { left: pointX + SIDE_GAP - w, right: pointX + SIDE_GAP };
        const ok = (b: Box, a: Box | null) =>
            b.left >= 0 &&
            b.right <= width &&
            (!a || b.right <= a.left || b.left >= a.right);
        let y = baseY;
        let anchor = candidates.find((a) => ok(boxOf(a), avoid));
        // 左右どちらも次の行のチップに重なるときは、反対側（点の上）に回す
        if (!anchor && fallback) {
            const alt = candidates.find((a) => ok(boxOf(a), fallback.avoid));
            if (alt) {
                anchor = alt;
                y = fallback.y;
            }
        }
        // 上も塞がっているときは、次の行のチップ・列番の右へずらして下に出す
        if (!anchor && fallback && avoid && avoid.right + 4 + w <= width) {
            result.push({
                key,
                text,
                x: avoid.right + 4,
                y: baseY,
                anchor: 'start',
            });
            return;
        }
        anchor ??= candidates[0];
        const box = boxOf(anchor);
        result.push({
            key,
            text,
            x: anchor === 'start' ? box.left : box.right,
            y,
            anchor,
        });
    };

    const startPoint = (row: OperationRouteDiagramBandRow) =>
        row.depotOutMarker ? row.depotOutX : row.leftX;
    const endPoint = (row: OperationRouteDiagramBandRow) =>
        row.depotInMarker ? row.depotInX : row.rightX;

    const first = rows[0];
    if (labels.from) {
        place(
            'from',
            labels.from,
            startPoint(first),
            first.centerY - ABOVE_OFFSET,
            chipBox(first),
            'start',
        );
    }

    rows.forEach((row, index) => {
        const mid = labels.midTrip[tripIds[index]];
        if (mid?.from) {
            place(
                `mid-from-${tripIds[index]}`,
                mid.from,
                startPoint(row),
                row.centerY - ABOVE_OFFSET,
                chipBox(row),
                'start',
            );
        }
        if (mid?.to) {
            place(
                `mid-to-${tripIds[index]}`,
                mid.to,
                endPoint(row),
                row.centerY + BELOW_OFFSET,
                rows[index + 1] ? chipBox(rows[index + 1]) : null,
                'start',
                { y: row.centerY - ABOVE_OFFSET, avoid: chipBox(row) },
            );
        }
    });

    const last = rows[rows.length - 1];
    if (labels.to) {
        place(
            'to',
            labels.to,
            endPoint(last),
            last.centerY + BELOW_OFFSET,
            null,
            'start',
        );
    }

    return result;
}
