import { formatCalendarSummaryLabel } from 'src/app/core/utils/format-calendar-summary-label.util';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { joinSummaryParts } from 'src/app/shared/control-band/control-band-summary.util';

/**
 * 細帯の要約の頭。例「上り 2026/3/14改正 平日」。後ろに路線の絞り込みが続く。
 * 選んだ主なもの（方向）を先に、ダイヤを後に並べる（docs/design.md 操作帯・ページの題名と同じ並び）
 */
export function formatTimetableAllLineSummaryLead(params: {
    calendar:
        | Pick<CalendarDetailsDto, 'calendarName' | 'startDate'>
        | null
        | undefined;
    directionLabel: string | null | undefined;
}): string {
    return joinSummaryParts([
        params.directionLabel,
        params.calendar ? formatCalendarSummaryLabel(params.calendar) : null,
    ]);
}
