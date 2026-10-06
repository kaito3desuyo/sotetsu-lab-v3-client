import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { formatCalendarSummaryLabel } from 'src/app/core/utils/format-calendar-summary-label.util';
import {
    formatFilterPart,
    joinSummaryParts,
} from 'src/app/shared/control-band/control-band-summary.util';

/** 細帯の要約。例「2026/3/14改正 平日 絞り込み中：G群（東横線） 5/90 運用」。 */
export function formatOperationTableSummary(params: {
    calendar:
        | Pick<CalendarDetailsDto, 'calendarName' | 'startDate'>
        | null
        | undefined;
    selectedGroupNames: string[];
    shown: number;
    total: number;
}): string {
    const filter =
        params.selectedGroupNames.length === 0
            ? formatFilterPart([])
            : `${formatFilterPart(params.selectedGroupNames)} ${params.shown}/${params.total} 運用`;
    return joinSummaryParts([
        params.calendar ? formatCalendarSummaryLabel(params.calendar) : null,
        filter,
    ]);
}
