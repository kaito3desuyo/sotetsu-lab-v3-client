import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { formatCalendarSummaryLabel } from 'src/app/core/utils/format-calendar-summary-label.util';
import { joinSummaryParts } from 'src/app/shared/control-band/control-band-summary.util';

/** 細帯の要約。例「横浜 下り 2026/3/14改正 平日」。選んだ主なもの（駅・方向）を先に、ダイヤを後に並べる（docs/design.md 操作帯・2026-11-13） */
export function formatTimetableStationSummary(params: {
    stationName: string | null | undefined;
    calendar:
        | Pick<CalendarDetailsDto, 'calendarName' | 'startDate'>
        | null
        | undefined;
    directionLabel: string | null | undefined;
}): string {
    return joinSummaryParts([
        params.stationName,
        params.directionLabel,
        params.calendar ? formatCalendarSummaryLabel(params.calendar) : null,
    ]);
}
