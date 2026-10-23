import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { formatCalendarSummaryLabel } from 'src/app/core/utils/format-calendar-summary-label.util';
import { joinSummaryParts } from 'src/app/shared/control-band/control-band-summary.util';

/** 細帯の要約。例「2026/3/14改正 平日 横浜 下り」。帯の選択欄と同じくダイヤ → 駅の並び（2026-10-23） */
export function formatTimetableStationSummary(params: {
    stationName: string | null | undefined;
    calendar:
        | Pick<CalendarDetailsDto, 'calendarName' | 'startDate'>
        | null
        | undefined;
    directionLabel: string | null | undefined;
}): string {
    return joinSummaryParts([
        params.calendar ? formatCalendarSummaryLabel(params.calendar) : null,
        params.stationName,
        params.directionLabel,
    ]);
}
