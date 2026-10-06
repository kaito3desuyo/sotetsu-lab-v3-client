import { formatTrainLocationSummary } from './train-location-summary.util';

describe('formatTrainLocationSummary', () => {
    it('現在時刻', () => {
        expect(
            formatTrainLocationSummary({
                routeName: '本線',
                mode: 'now',
                timeText: '08:00',
                calendarName: '平日',
            }),
        ).toBe('本線 現在時刻（今日のダイヤ）');
    });
    it('時刻指定は時刻（先頭の 0 を落とす）とダイヤ名', () => {
        expect(
            formatTrainLocationSummary({
                routeName: '本線',
                mode: 'specified',
                timeText: '08:00',
                calendarName: '平日',
            }),
        ).toBe('本線 8:00 指定 平日');
    });
});
