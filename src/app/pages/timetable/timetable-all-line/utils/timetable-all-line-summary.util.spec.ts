import { formatTimetableAllLineSummaryLead } from './timetable-all-line-summary.util';

describe('formatTimetableAllLineSummaryLead', () => {
    it('方向・ダイヤ（選んだ主なものを先に。docs/design.md 操作帯）', () => {
        expect(
            formatTimetableAllLineSummaryLead({
                calendar: { calendarName: '平日', startDate: '2026-03-14' },
                directionLabel: '上り',
            }),
        ).toBe('上り 2026/3/14改正 平日');
    });

    it('欠けた部分は飛ばす', () => {
        expect(
            formatTimetableAllLineSummaryLead({
                calendar: null,
                directionLabel: '下り',
            }),
        ).toBe('下り');
    });
});
