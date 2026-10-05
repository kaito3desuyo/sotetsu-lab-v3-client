import { TripDiagramLine } from './build-trip-diagram-line.util';

export type PlacedThroughLabel = {
    tripId: string;
    x: number;
    y: number;
    text: string;
    anchor: 'start' | 'end';
    /** 強調中の列車がある間、強調外の線のラベルは 0.15（線の薄さと揃える）。 */
    opacity: number;
};

type Candidate = PlacedThroughLabel & {
    /** 横方向の占有範囲（overlap 判定用。x は基点であって範囲そのものではない） */
    extentFrom: number;
    extentTo: number;
};

/** 文字の幅の見積り（10px フォント・ほぼ全角文字想定）。8px は左右の余白ぶん。 */
function estimateWidth(text: string): number {
    return text.length * 10 + 8;
}

/**
 * 強調中の行き先ラベル（anchor: 'start'）を停車分ラベル（`x(minute) + 3`、幅約12px）の
 * 右へずらすオフセット。3（停車分ラベル自身のオフセット）+ 12（その幅の見積り）+
 * 4（隙間）= 19。強調していない行き先ラベルは従来どおり +4。
 */
const DESTINATION_HIGHLIGHT_OFFSET = 3 + 12 + 4;

/**
 * 同じ駅の行（同じ y）に複数の直通先ラベル（「→ 渋谷」「新宿 →」…）が重なって
 * 描かれてしまう問題への対処。x（テンプレートの `x(label.minute) + (anchor==='start'?4:-4)`
 * と同じ計算）の昇順で配置していき、同じ y・同じ側（anchor）で既に置いたラベルと
 * 横方向の占有範囲が重なるものは間引く。行き先ラベル（anchor:'start'）は線の上、
 * 始発駅ラベル（anchor:'end'）は線の下に描き分けるため、間引き判定も y と anchor の
 * 組で別グループにする（同じ x/y でも上下に分かれていれば両方残る）。
 * 強調中（highlightedTripIds）の列車のラベルは常に表示するため、他のラベルより先に
 * 置く（x 順ではなく最優先）。強調中の行き先ラベルはさらに、選択列車の停車分ラベルと
 * 重ならないよう右へずらす（DESTINATION_HIGHLIGHT_OFFSET）。ただし Task 19 で停車分
 * ラベルが線の下（side: 'below'）に描かれているときは、行き先ラベル（線の上）と
 * 基準線が別れているため重ならず、ずらす必要が無い。
 */
export function placeThroughLabels(
    lines: readonly TripDiagramLine[],
    pxPerMinute: number,
    highlightedTripIds: ReadonlySet<string>,
): PlacedThroughLabel[] {
    const candidates: Candidate[] = [];
    const hasHighlight = highlightedTripIds.size > 0;

    for (const line of lines) {
        const highlighted = highlightedTripIds.has(line.tripId);
        const opacity = hasHighlight && !highlighted ? 0.15 : 1;
        const lastStopLabel = line.stopLabels[line.stopLabels.length - 1];
        const avoidsStopLabel = lastStopLabel?.side !== 'below';
        for (const label of line.throughLabels) {
            const baseX = label.minute * pxPerMinute;
            const x =
                label.anchor === 'start'
                    ? baseX +
                      (highlighted && avoidsStopLabel
                          ? DESTINATION_HIGHLIGHT_OFFSET
                          : 4)
                    : baseX - 4;
            const width = estimateWidth(label.text);
            const [extentFrom, extentTo] =
                label.anchor === 'end' ? [x - width, x] : [x, x + width];
            candidates.push({
                tripId: line.tripId,
                x,
                y: label.y,
                text: label.text,
                anchor: label.anchor,
                opacity,
                extentFrom,
                extentTo,
            });
        }
    }

    // 強調中の列車のラベルを最優先（常に表示）、それ以外は x の昇順で処理する。
    candidates.sort((a, b) => {
        const aHighlighted = highlightedTripIds.has(a.tripId) ? 0 : 1;
        const bHighlighted = highlightedTripIds.has(b.tripId) ? 0 : 1;
        if (aHighlighted !== bHighlighted) {
            return aHighlighted - bHighlighted;
        }
        return a.x - b.x;
    });

    const placedExtentsByKey = new Map<
        string,
        { from: number; to: number }[]
    >();
    const result: PlacedThroughLabel[] = [];

    for (const candidate of candidates) {
        const key = `${candidate.y}:${candidate.anchor}`;
        const placedExtents = placedExtentsByKey.get(key) ?? [];
        const overlaps = placedExtents.some(
            (extent) =>
                candidate.extentFrom < extent.to &&
                candidate.extentTo > extent.from,
        );
        if (overlaps) {
            continue;
        }
        placedExtents.push({
            from: candidate.extentFrom,
            to: candidate.extentTo,
        });
        placedExtentsByKey.set(key, placedExtents);
        result.push({
            tripId: candidate.tripId,
            x: candidate.x,
            y: candidate.y,
            text: candidate.text,
            anchor: candidate.anchor,
            opacity: candidate.opacity,
        });
    }

    return result;
}
