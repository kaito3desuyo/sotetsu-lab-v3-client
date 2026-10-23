import { formatTimetableStationSummary } from './timetable-station-summary.util';

describe('formatTimetableStationSummary', () => {
    it('ダイヤ・駅・方向（帯の選択欄と同じ並び）', () => {
        expect(
            formatTimetableStationSummary({
                stationName: '横浜',
                calendar: { calendarName: '平日', startDate: '2026-03-14' },
                directionLabel: '下り',
            }),
        ).toBe('2026/3/14改正 平日 横浜 下り');
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
