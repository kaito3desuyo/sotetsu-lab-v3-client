import { CalendarDateDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-date-details.dto';

const SPECIAL_DIAGRAM_LABEL = '特別ダイヤ';

/**
 * その日の運行日例外（calendar_dates）から「何の日か」を取り出す。無ければ null。
 *
 * calendar_dates.memo には 3 種類のシードが書き込む（api: db/seeds/seed-calendar-dates-*）。
 * どれも出す（ユーザー判断 2026-09-23）:
 * - 祝日: 内閣府 CSV の祝日名（例: 秋分の日 / 振替休日・国民の休日は「休日」）
 * - 年末年始: 「年末年始」
 * - 特別日: 「特別ダイヤ（specialCalendarDays 移行…）」。括弧内は移行作業の内部メモ
 *   なので「特別ダイヤ」だけにする
 *
 * 同じ日に複数のダイヤ（平日=除外 / 土休日=追加）の行があり、memo は同じなので
 * 最初に見つかったものを返す。1/1 は祝日のシードが先勝ちで「元日」になる。
 */
export function pickDayName(
    calendarDates: readonly CalendarDateDetailsDto[],
): string | null {
    for (const { memo } of calendarDates) {
        const name = memo?.trim();
        if (!name) {
            continue;
        }
        return name.startsWith(SPECIAL_DIAGRAM_LABEL)
            ? SPECIAL_DIAGRAM_LABEL
            : name;
    }
    return null;
}
