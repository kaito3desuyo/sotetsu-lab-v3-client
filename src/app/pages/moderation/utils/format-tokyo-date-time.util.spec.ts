import {
    formatTokyoDateTime,
    formatTokyoDateTimeWithYear,
} from './format-tokyo-date-time.util';

describe('formatTokyoDateTime', () => {
    it('UTC の時刻を日本時間の「月/日 時:分:秒」にする', () => {
        expect(formatTokyoDateTime('2026-11-02T15:04:05.678Z')).toBe(
            '11/3 00:04:05',
        );
    });

    it('時・分・秒は 2 桁にそろえ、月・日は 0 を付けない', () => {
        expect(formatTokyoDateTime('2026-01-05T00:01:02.000Z')).toBe(
            '1/5 09:01:02',
        );
    });
});

describe('formatTokyoDateTimeWithYear', () => {
    it('日本時間の「年/月/日 時:分」にする（月・日も 2 桁）', () => {
        expect(formatTokyoDateTimeWithYear('2026-11-03T01:00:30.000Z')).toBe(
            '2026/11/03 10:00',
        );
        expect(formatTokyoDateTimeWithYear('2026-01-05T00:01:02.000Z')).toBe(
            '2026/01/05 09:01',
        );
    });
});
