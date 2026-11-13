import {
    formatJst,
    getRailwayDate,
    jstDateTimeOf,
    railwayClock,
    railwayDateKey,
    railwayDayStart,
    railwayTimeToInstant,
    toAbsoluteTime,
    toDisplayTime,
    toRailwayDateKey,
    toServiceSeconds,
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
    // base は railwayDayStart() の値（日本時間 2026-07-04 0 時 = 2026-07-03T15:00:00Z）
    const base = railwayDayStart(new Date('2026-07-04T01:00:00Z'));

    it('days=0 の通常時刻は base と同じ日の時刻になる', () => {
        expect(toAbsoluteTime(base, 0, '09:30:00').toISOString()).toBe(
            '2026-07-04T00:30:00.000Z',
        );
    });

    it('days=1・00:30:00（24時超え相当）は翌日の実時刻になる', () => {
        expect(toAbsoluteTime(base, 1, '00:30:00').toISOString()).toBe(
            '2026-07-04T15:30:00.000Z',
        );
    });

    it('秒まで正しく復元する', () => {
        expect(toAbsoluteTime(base, 0, '23:59:59').toISOString()).toBe(
            '2026-07-04T14:59:59.000Z',
        );
    });

    it('days=2 で 2 日先の実時刻になる', () => {
        expect(toAbsoluteTime(base, 2, '01:15:00').toISOString()).toBe(
            '2026-07-05T16:15:00.000Z',
        );
    });
});

describe('toDisplayTime', () => {
    it('days=1・00:30:00 は "24:30" になる（24時超え表記）', () => {
        expect(toDisplayTime(1, '00:30:00')).toBe('24:30');
    });

    it('days=0 の通常時刻は時もゼロで埋めて "HH:mm" になる（docs/design.md 時刻と日付の書き方）', () => {
        expect(toDisplayTime(0, '09:05:00')).toBe('09:05');
    });

    it('days=0・0時ちょうどは "00:00" になる', () => {
        expect(toDisplayTime(0, '00:00:00')).toBe('00:00');
    });

    it('days=1・23:59:00 は "47:59" になる（深夜帯の日またぎ）', () => {
        expect(toDisplayTime(1, '23:59:00')).toBe('47:59');
    });

    it('days=2 で 48 時間分繰り上がる', () => {
        expect(toDisplayTime(2, '01:00:00')).toBe('49:00');
    });

    it('分が1桁でも2桁ゼロ埋めされる', () => {
        expect(toDisplayTime(0, '05:03:00')).toBe('05:03');
    });
});

describe('toServiceSeconds', () => {
    it('日オフセットが同じなら時刻の順になる', () => {
        expect(toServiceSeconds(1, '06:20:00')).toBeLessThan(
            toServiceSeconds(1, '06:45:00'),
        );
    });

    it('翌日（days=2）の 0:30 は当日（days=1）の 23:50 より後になる', () => {
        expect(toServiceSeconds(2, '00:30:00')).toBeGreaterThan(
            toServiceSeconds(1, '23:50:00'),
        );
    });

    it('差は秒で出る', () => {
        expect(
            toServiceSeconds(2, '00:00:30') - toServiceSeconds(1, '23:59:30'),
        ).toBe(60);
    });

    it('時刻が無ければ NaN（比較はどれも false になる）', () => {
        expect(toServiceSeconds(1, null)).toBeNaN();
        expect(toServiceSeconds(1, undefined)).toBeNaN();
    });
});

describe('toRailwayDateKey', () => {
    it('日本時間の翌 3:59 はその日の営業日', () => {
        expect(toRailwayDateKey('2026-11-11T18:59:00Z')).toBe('2026-11-11');
    });

    it('日本時間の翌 4:00 は翌日の営業日', () => {
        expect(toRailwayDateKey('2026-11-11T19:00:00Z')).toBe('2026-11-12');
    });
});

describe('日本時間で決める（端末の時刻帯に頼らない）', () => {
    it.each([
        ['2026-11-13T01:30:00Z', '2026-11-13'], // JST 10:30
        ['2026-11-12T18:59:00Z', '2026-11-12'], // JST 03:59 は前日の営業日
        ['2026-11-12T19:00:00Z', '2026-11-13'], // JST 04:00 から当日
    ])('railwayDateKey(%s) は %s', (iso, key) => {
        expect(railwayDateKey(new Date(iso))).toBe(key);
    });

    it('railwayDayStart は営業日の日本時間 0 時', () => {
        expect(
            railwayDayStart(new Date('2026-11-12T18:59:00Z')).toISOString(),
        ).toBe('2026-11-11T15:00:00.000Z');
        expect(
            railwayDayStart(new Date('2026-11-13T01:30:00Z')).toISOString(),
        ).toBe('2026-11-12T15:00:00.000Z');
    });

    it('railwayClock は日本時間の時と分', () => {
        expect(railwayClock(new Date('2026-11-13T01:30:00Z'))).toEqual({
            hours: 10,
            minutes: 30,
        });
    });

    it('toAbsoluteTime は営業日の 0 時に days と時刻を足した時点', () => {
        const base = railwayDayStart(new Date('2026-11-13T01:30:00Z'));
        expect(toAbsoluteTime(base, 0, '09:05:00').toISOString()).toBe(
            '2026-11-13T00:05:00.000Z',
        );
        expect(toAbsoluteTime(base, 1, '00:30:00').toISOString()).toBe(
            '2026-11-13T15:30:00.000Z',
        );
    });

    it.each([
        ['2026-11-13T01:30:00Z', 10, 0, '2026-11-13T01:00:00.000Z'], // JST 10:30 に 10:00
        ['2026-11-13T01:30:00Z', 1, 0, '2026-11-13T16:00:00.000Z'], // JST 10:30 に 1:00 は翌日の 1:00
        ['2026-11-12T17:00:00Z', 23, 30, '2026-11-12T14:30:00.000Z'], // JST 2:00 に 23:30 は前日の 23:30
    ])('railwayTimeToInstant(%s, %i:%i) は %s', (now, h, m, iso) => {
        expect(railwayTimeToInstant(new Date(now), h, m).toISOString()).toBe(
            iso,
        );
    });

    it('jstDateTimeOf は日本時間の暦の日に時刻を付ける', () => {
        expect(
            jstDateTimeOf(new Date('2026-11-12T17:00:00Z'), 1, 0).toISOString(),
        ).toBe('2026-11-12T16:00:00.000Z');
    });

    it('formatJst は日本時間で書く', () => {
        expect(formatJst(new Date('2026-11-13T01:30:00Z'), 'HH:mm')).toBe(
            '10:30',
        );
    });
});
