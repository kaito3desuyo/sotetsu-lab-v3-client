import { formatTimetableStationSummary } from './timetable-station-summary.util';

describe('formatTimetableStationSummary', () => {
    it('駅・方向・ダイヤ（選んだ主なものを先に。docs/design.md 操作帯）', () => {
        expect(
            formatTimetableStationSummary({
                stationName: '横浜',
                calendar: { calendarName: '平日', startDate: '2026-03-14' },
                directionLabel: '下り',
            }),
        ).toBe('横浜 下り 2026/3/14改正 平日');
    });
    it('欠けた部分は飛ばす', () => {
        expect(
            formatTimetableStationSummary({
                stationName: '横浜',
                calendar: null,
                directionLabel: null,
            }),
        ).toBe('横浜');
    });
});
