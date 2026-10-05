import { formatCalendarSummaryLabel } from './format-calendar-summary-label.util';

describe('formatCalendarSummaryLabel', () => {
    it('改正日とダイヤ名を短い形式で整形する', () => {
        expect(
            formatCalendarSummaryLabel({
                calendarName: '土休日',
                startDate: '2026-03-14',
            }),
        ).toBe('2026/3/14改正 土休日');
    });

    it('startDate がなければダイヤ名のみを返す', () => {
        expect(formatCalendarSummaryLabel({ calendarName: '平日' })).toBe(
            '平日',
        );
    });

    it('ダイヤ名がなければ改正日のみを返す', () => {
        expect(formatCalendarSummaryLabel({ startDate: '2026-03-14' })).toBe(
            '2026/3/14改正',
        );
    });
});
