import { CalendarDateDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-date-details.dto';

const SPECIAL_DIAGRAM_LABEL = '特別ダイヤ';

/**
 * 運行日例外（calendar_dates）から、日ごとの祝日名を取り出す。
 * memo は祝日のシードでは祝日名（振替休日・国民の休日は「休日」）、年末年始のシードでは「年末年始」。
 * 特別ダイヤの日は祝日ではないので除く。同じ日に複数行あるときは最初の memo を使う。
 */
export const buildHolidayNames = (
    calendarDates: readonly CalendarDateDetailsDto[],
): Record<string, string> => {
    const names: Record<string, string> = {};
    for (const { date, memo } of calendarDates) {
        const name = memo?.trim();
        if (!date || !name || name.startsWith(SPECIAL_DIAGRAM_LABEL)) continue;
        names[date] ??= name;
    }
    return names;
};
