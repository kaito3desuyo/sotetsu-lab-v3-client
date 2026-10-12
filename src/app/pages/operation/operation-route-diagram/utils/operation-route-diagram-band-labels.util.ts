import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { OperationRouteDiagramBandViewModel } from './operation-route-diagram-build-band-view-models.util';
import { ROUTE_DIAGRAM_SIDE_PAD } from './operation-route-diagram-fit-columns.util';
import { isRouteDiagramOutsideStationId } from './operation-route-diagram-reconnect-trip-operation-lists.util';

/** 時刻の字の大きさ。時刻は線の高さの中央、端の外側に置く（本番と同じ） */
export const ROUTE_DIAGRAM_TIME_FONT_SIZE = 14;
/** 線の端から時刻までの間。端に○・△があるときはそれをよける */
const TIME_GAP = 6;
const TIME_GAP_WITH_MARKER = 13;

/** ラベルと図の左右の端の間 */
const LABEL_EDGE_GAP = 4;
/** ラベルを縦線の横へずらすときの、縦線との間 */
const LABEL_CONNECTOR_GAP = 6;
/** 両端とも図の外にある列車を図外の列に描く短い線の、半分の長さ */
export const ROUTE_DIAGRAM_OUTSIDE_STUB_HALF = 8;

/** `HH:mm:ss` を本番と同じ 4 桁（`HHmm`）にする */
function formatTime(time: string | undefined): string {
    return time ? time.slice(0, 2) + time.slice(3, 5) : '';
}

/** 端の外側に書く字。隠した駅から付け替えた端は、時刻の前に本当の駅名を書く */
function endLabel(
    time: string | undefined,
    hiddenStationName: string | undefined,
): string | undefined {
    if (!time) return undefined;
    return hiddenStationName
        ? `${hiddenStationName} ${formatTime(time)}`
        : formatTime(time);
}

export interface OperationRouteDiagramBandLabels {
    leftLabel?: string;
    rightLabel?: string;
    /** 両端とも同じ図外の列にある（短い線を引き、外側だけに書く） */
    stub: boolean;
    leftGap: number;
    rightGap: number;
}

/**
 * 列車 1 本ぶんの、線の両端の外側に書く字と、線の端から字までの間を決める。
 * 列の座標に依らないので、余白を決める前に求められる。
 */
export function buildBandLabels(
    vm: OperationRouteDiagramBandViewModel,
    stations: readonly StationDetailsDto[],
): OperationRouteDiagramBandLabels {
    const hasMarkerAt = (stationIndex: number) =>
        (vm.depotOutMarker && vm.depotOutIndex === stationIndex) ||
        (vm.depotInMarker && vm.depotInIndex === stationIndex);
    const leftGap = hasMarkerAt(vm.leftIndex) ? TIME_GAP_WITH_MARKER : TIME_GAP;
    const rightGap = hasMarkerAt(vm.rightIndex)
        ? TIME_GAP_WITH_MARKER
        : TIME_GAP;

    const stub =
        vm.leftIndex === vm.rightIndex &&
        isRouteDiagramOutsideStationId(stations[vm.leftIndex]?.stationId);
    if (stub) {
        // 外側に「駅名 時刻→駅名 時刻」。同じ駅なら 2 つめの駅名は省く
        const start = endLabel(vm.depotOutTime, vm.startHiddenStationName);
        const end =
            vm.startHiddenStationName === vm.endHiddenStationName
                ? formatTime(vm.depotInTime)
                : endLabel(vm.depotInTime, vm.endHiddenStationName);
        const label = [start, end].filter((t) => t).join('→');
        return vm.leftIndex === 0
            ? { leftLabel: label, stub, leftGap, rightGap }
            : { rightLabel: label, stub, leftGap, rightGap };
    }

    return {
        leftLabel: endLabel(vm.leftTime, vm.leftStationName),
        rightLabel: endLabel(vm.rightTime, vm.rightStationName),
        stub,
        leftGap,
        rightGap,
    };
}

/**
 * 字の幅の概算。getBBox で測らず、全角は字の大きさ、半角（Latin-1）はその 0.6 倍とみなす。
 */
export function estimateTextWidth(text: string, fontSize: number): number {
    let width = 0;
    for (const ch of text) {
        width += ch.charCodeAt(0) <= 0xff ? fontSize * 0.6 : fontSize;
    }
    return width;
}

/**
 * ラベル（種別チップ＋列番）の左端の x を決める。区間の中央に置くのが基本。
 *
 * 前の列車から下りてくる縦線はラベルの高さを通るので、区間が短い（直通で先の駅が
 * 隠れる・駅 1 つぶんの回送など）ラベルにかかるときは、縦線の横へずらす。
 * ずらす向きは、区間の中央に近い側。図の外へははみ出させない。
 */
export function placeLabel(
    labelWidth: number,
    centerX: number,
    incomingX: number | undefined,
    svgWidth: number,
): number {
    const clamp = (x: number) =>
        Math.min(
            Math.max(x, LABEL_EDGE_GAP),
            svgWidth - LABEL_EDGE_GAP - labelWidth,
        );
    const crosses = (x: number) =>
        incomingX !== undefined &&
        x - LABEL_CONNECTOR_GAP < incomingX &&
        incomingX < x + labelWidth + LABEL_CONNECTOR_GAP;

    const centered = clamp(centerX - labelWidth / 2);
    if (!crosses(centered)) return centered;

    const candidates = [
        clamp(incomingX! + LABEL_CONNECTOR_GAP),
        clamp(incomingX! - LABEL_CONNECTOR_GAP - labelWidth),
    ].filter((x) => !crosses(x));
    if (candidates.length === 0) return centered;

    const distance = (x: number) => Math.abs(x + labelWidth / 2 - centerX);
    return candidates.reduce((a, b) => (distance(b) < distance(a) ? b : a));
}

/**
 * 端の列の外側に書く字が、既定の余白（4 桁の時刻＋○・△ ぶん）に収まらないときに
 * 足す余白。図外の駅名を書くときに要る
 */
export function computeExtraSidePads(
    viewModels: readonly OperationRouteDiagramBandViewModel[],
    bandLabels: readonly OperationRouteDiagramBandLabels[],
    stationCount: number,
): { left: number; right: number } {
    const lastIndex = stationCount - 1;
    const need = (label: string | undefined, gap: number, stub: boolean) =>
        label
            ? (stub ? ROUTE_DIAGRAM_OUTSIDE_STUB_HALF : 0) +
              gap +
              estimateTextWidth(label, ROUTE_DIAGRAM_TIME_FONT_SIZE) +
              LABEL_EDGE_GAP
            : 0;

    let left = 0;
    let right = 0;
    viewModels.forEach((vm, index) => {
        const labels = bandLabels[index];
        if (vm.leftIndex === 0) {
            left = Math.max(
                left,
                need(labels.leftLabel, labels.leftGap, labels.stub),
            );
        }
        if (vm.rightIndex === lastIndex) {
            right = Math.max(
                right,
                need(labels.rightLabel, labels.rightGap, labels.stub),
            );
        }
    });

    return {
        left: Math.max(left - ROUTE_DIAGRAM_SIDE_PAD, 0),
        right: Math.max(right - ROUTE_DIAGRAM_SIDE_PAD, 0),
    };
}
