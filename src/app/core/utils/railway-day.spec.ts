import {
    getRailwayDate,
    toAbsoluteTime,
    toDisplayTime,
} from './railway-day';

describe('getRailwayDate', () => {
    it('3:59 は前日の営業日になる', () => {
        const now = new Date(2026, 6, 4, 3, 59, 59);
        const result = getRailwayDate(now);
        expect(result).toEqual(new Date(2026, 6, 3, 0, 0, 0, 0));
    });

    it('4:00 は当日の営業日になる（境界値）', () => {
        const now = new Date(2026, 6, 4, 4, 0, 0);
        const result = getRailwayDate(now);
        expect(result).toEqual(new Date(2026, 6, 4, 0, 0, 0, 0));
    });

    it('3:59 と 4:00 の1分差で営業日が切り替わる', () => {
        const before = getRailwayDate(new Date(2026, 6, 4, 3, 59, 0));
        const after = getRailwayDate(new Date(2026, 6, 4, 4, 0, 0));
        expect(before).toEqual(new Date(2026, 6, 3, 0, 0, 0, 0));
        expect(after).toEqual(new Date(2026, 6, 4, 0, 0, 0, 0));
    });

    it('0時ちょうどは前日の営業日になる', () => {
        const now = new Date(2026, 6, 4, 0, 0, 0);
        const result = getRailwayDate(now);
        expect(result).toEqual(new Date(2026, 6, 3, 0, 0, 0, 0));
    });

    it('深夜帯（2:30）は前日の営業日になる', () => {
        const now = new Date(2026, 6, 4, 2, 30, 0);
        const result = getRailwayDate(now);
        expect(result).toEqual(new Date(2026, 6, 3, 0, 0, 0, 0));
    });

    it('日中の時刻は当日の営業日になる', () => {
        const now = new Date(2026, 6, 4, 15, 30, 0);
        const result = getRailwayDate(now);
        expect(result).toEqual(new Date(2026, 6, 4, 0, 0, 0, 0));
    });

    it('23:59 は当日の営業日になる', () => {
        const now = new Date(2026, 6, 4, 23, 59, 59);
        const result = getRailwayDate(now);
        expect(result).toEqual(new Date(2026, 6, 4, 0, 0, 0, 0));
    });
});

describe('toAbsoluteTime', () => {
    it('days=0 の通常時刻は base と同じ日の時刻になる', () => {
        const base = new Date(2026, 6, 4, 0, 0, 0);
        const result = toAbsoluteTime(base, 0, '09:30:00');
        expect(result).toEqual(new Date(2026, 6, 4, 9, 30, 0));
    });

    it('days=1・00:30:00（24時超え相当）は翌日の実時刻になる', () => {
        const base = new Date(2026, 6, 4, 0, 0, 0);
        const result = toAbsoluteTime(base, 1, '00:30:00');
        expect(result).toEqual(new Date(2026, 6, 5, 0, 30, 0));
    });

    it('秒まで正しく復元する', () => {
        const base = new Date(2026, 6, 4, 0, 0, 0);
        const result = toAbsoluteTime(base, 0, '23:59:59');
        expect(result).toEqual(new Date(2026, 6, 4, 23, 59, 59));
    });

    it('base が 0 時以外でも base の日付の 0 時基準で計算する', () => {
        const base = new Date(2026, 6, 4, 13, 45, 0);
        const result = toAbsoluteTime(base, 0, '05:00:00');
        expect(result).toEqual(new Date(2026, 6, 4, 5, 0, 0));
    });

    it('days=2 で 2 日先の実時刻になる', () => {
        const base = new Date(2026, 6, 4, 0, 0, 0);
        const result = toAbsoluteTime(base, 2, '01:15:00');
        expect(result).toEqual(new Date(2026, 6, 6, 1, 15, 0));
    });
});

describe('toDisplayTime', () => {
    it('days=1・00:30:00 は "24:30" になる（24時超え表記）', () => {
        expect(toDisplayTime(1, '00:30:00')).toBe('24:30');
    });

    it('days=0 の通常時刻はそのまま "H:mm" になる', () => {
        expect(toDisplayTime(0, '09:05:00')).toBe('9:05');
    });

    it('days=0・0時ちょうどは "0:00" になる', () => {
        expect(toDisplayTime(0, '00:00:00')).toBe('0:00');
    });

    it('days=1・23:59:00 は "47:59" になる（深夜帯の日またぎ）', () => {
        expect(toDisplayTime(1, '23:59:00')).toBe('47:59');
    });

    it('days=2 で 48 時間分繰り上がる', () => {
        expect(toDisplayTime(2, '01:00:00')).toBe('49:00');
    });

    it('分が1桁でも2桁ゼロ埋めされる', () => {
        expect(toDisplayTime(0, '05:03:00')).toBe('5:03');
    });
});
