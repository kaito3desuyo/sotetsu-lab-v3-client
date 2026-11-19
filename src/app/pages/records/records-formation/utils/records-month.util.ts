import { addMonths, format, getDay, getDaysInMonth } from 'date-fns';
import { railwayDateKey } from 'src/app/core/utils/railway-day';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** 'YYYY-MM' の月の 1 日（端末の時刻帯の中で暦の日だけを使う）。 */
function monthStart(month: string): Date {
    const [year, monthNumber] = month.split('-').map(Number);
    const start = new Date(year, monthNumber - 1, 1);
    // 0〜99 年を 1900 年代に読まれないように年を入れ直す
    start.setFullYear(year);
    return start;
}

/** 今の鉄道日が属する月 'YYYY-MM'（日本時間 4:00 区切り）。 */
export function currentRailwayMonth(now: Date = new Date()): string {
    return railwayDateKey(now).slice(0, 7);
}

/**
 * URL の月パラメータを検証する。'YYYY-MM' の形で今の月以前ならそれを返し、
 * それ以外（不正な形・未来の月・未指定）は今の月を返す。
 */
export function parseMonthParam(
    value: string | undefined,
    now: Date = new Date(),
): string {
    const current = currentRailwayMonth(now);
    if (value && MONTH_PATTERN.test(value) && value <= current) {
        return value;
    }
    return current;
}

/** 月の初日と末日（'YYYY-MM-DD'）。api の期間指定にそのまま渡す。 */
export function monthPeriod(month: string): { from: string; to: string } {
    const lastDay = getDaysInMonth(monthStart(month));
    return {
        from: `${month}-01`,
        to: `${month}-${String(lastDay).padStart(2, '0')}`,
    };
}

/** 'YYYY-MM' の月を delta か月ずらす。 */
export function shiftMonth(month: string, delta: -1 | 1): string {
    return format(addMonths(monthStart(month), delta), 'yyyy-MM');
}

/**
 * 月の週ごとの日付（'YYYY-MM-DD'）を月曜始まりで返す。
 * 月の外の日は null。各週は必ず 7 要素。
 */
export function buildMonthWeeks(month: string): (string | null)[][] {
    const start = monthStart(month);
    const days = getDaysInMonth(start);
    // date-fns の getDay は日曜が 0。月曜始まりで月曜を 0 にする
    const leading = (getDay(start) + 6) % 7;
    const cells: (string | null)[] = [
        ...Array.from({ length: leading }, (): null => null),
        ...Array.from(
            { length: days },
            (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`,
        ),
    ];
    while (cells.length % 7 !== 0) {
        cells.push(null);
    }
    const weeks: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
        weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
}
