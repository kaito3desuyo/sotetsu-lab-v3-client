import { differenceInCalendarDays, parseISO } from 'date-fns';
import { getRailwayDate } from './railway-day';

/**
 * 目撃日時が、今日の営業日から何日前かを返す（4 時より前は前日の営業日に数える）。
 * 目撃が無ければ NaN。
 */
export function calculateDayCountFromToday(
    dateTime: string | null | undefined,
): number {
    if (!dateTime) return NaN;

    return differenceInCalendarDays(
        getRailwayDate(new Date()),
        getRailwayDate(parseISO(dateTime)),
    );
}
