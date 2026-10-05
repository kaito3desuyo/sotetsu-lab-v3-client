import { TripDiagramLine } from './build-trip-diagram-line.util';
import { VISIBLE_MARGIN_MINUTES } from './diagram-timeline.util';

/**
 * 見えている範囲（4 時からの分）の前後 marginMinutes 分にかかる線だけを残す。
 * 強調中（highlightedTripIds に含まれる）の線は範囲外でも残し、SVG の後勝ち描画で
 * 最前面になるよう配列の最後へ置く。
 */
export function selectVisibleLines(
    lines: readonly TripDiagramLine[],
    range: { startMinute: number; endMinute: number },
    highlightedTripIds: ReadonlySet<string>,
    marginMinutes: number = VISIBLE_MARGIN_MINUTES,
): TripDiagramLine[] {
    const from = range.startMinute - marginMinutes;
    const to = range.endMinute + marginMinutes;
    const visible: TripDiagramLine[] = [];
    const highlighted: TripDiagramLine[] = [];
    for (const line of lines) {
        if (highlightedTripIds.has(line.tripId)) {
            highlighted.push(line);
            continue;
        }
        if (line.maxMinute >= from && line.minMinute <= to) {
            visible.push(line);
        }
    }
    return [...visible, ...highlighted];
}
