import { format, parse } from 'date-fns';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';

/**
 * 折り畳みパネルのヘッダー要約向けにダイヤ（カレンダー）を短いラベルへ整形する純関数。
 * 例: '2026/3/14改正 土休日'。startDate がなければダイヤ名のみを返す。
 */
export function formatCalendarSummaryLabel(
    calendar: Pick<CalendarDetailsDto, 'calendarName' | 'startDate'>,
): string {
    const name = calendar.calendarName ?? '';
    if (!calendar.startDate) {
        return name;
    }
    const revisedOn = format(
        parse(calendar.startDate, 'yyyy-MM-dd', new Date()),
        'yyyy/M/d改正',
    );
    return [revisedOn, name].filter((part) => !!part).join(' ');
}
