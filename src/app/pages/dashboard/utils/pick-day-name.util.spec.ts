import { CalendarDateDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-date-details.dto';
import { pickDayName } from './pick-day-name.util';

function row(memo: string | null): CalendarDateDetailsDto {
    return { calendarDateId: 'x', memo } as CalendarDateDetailsDto;
}

describe('pickDayName', () => {
    it('祝日のシードの memo（祝日名）を返す', () => {
        expect(pickDayName([row('秋分の日'), row('秋分の日')])).toBe(
            '秋分の日',
        );
    });

    it('振替休日・国民の休日の「休日」もそのまま返す', () => {
        expect(pickDayName([row('休日')])).toBe('休日');
    });

    it('年末年始は「年末年始」を返す', () => {
        expect(pickDayName([row('年末年始')])).toBe('年末年始');
    });

    it('運行日例外が無ければ null', () => {
        expect(pickDayName([])).toBeNull();
    });

    it('特別ダイヤは内部メモの括弧を落として「特別ダイヤ」を返す', () => {
        expect(
            pickDayName([
                row(
                    '特別ダイヤ（specialCalendarDays 移行・通常カレンダーの運休）',
                ),
                row('特別ダイヤ（specialCalendarDays 移行）'),
            ]),
        ).toBe('特別ダイヤ');
    });

    it('memo なし・空白だけは null', () => {
        expect(pickDayName([row(null), row('  ')])).toBeNull();
    });
});
