import { formatTimetableStationSummary } from './timetable-station-summary.util';

describe('formatTimetableStationSummary', () => {
    it('駅・ダイヤ・方向', () => {
        expect(
            formatTimetableStationSummary({
                stationName: '横浜',
                calendar: { calendarName: '平日', startDate: '2026-03-14' },
                directionLabel: '下り',
            }),
        ).toBe('横浜 2026/3/14改正 平日 下り');
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
