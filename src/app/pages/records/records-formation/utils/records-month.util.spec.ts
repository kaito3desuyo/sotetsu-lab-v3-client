import {
    buildMonthWeeks,
    currentRailwayMonth,
    monthPeriod,
    parseMonthParam,
    shiftMonth,
} from './records-month.util';

// 2026-11-20 の日本時間 12:00 を「今」とする（今の月は 2026-11）
const NOW = new Date('2026-11-20T03:00:00Z');

describe('records-month.util', () => {
    describe('currentRailwayMonth', () => {
        it('日本時間 12/1 03:59 は鉄道日でまだ 11 月なので 2026-11 を返す', () => {
            expect(currentRailwayMonth(new Date('2026-11-30T18:59:00Z'))).toBe(
                '2026-11',
            );
        });

        it('日本時間 12/1 04:00 から鉄道日が 12 月になるので 2026-12 を返す', () => {
            expect(currentRailwayMonth(new Date('2026-11-30T19:00:00Z'))).toBe(
                '2026-12',
            );
        });
    });

    describe('parseMonthParam', () => {
        it('今の月より前の有効な月はそのまま返す', () => {
            expect(parseMonthParam('2014-01', NOW)).toBe('2014-01');
        });

        it('今の月はそのまま返す', () => {
            expect(parseMonthParam('2026-11', NOW)).toBe('2026-11');
        });

        it('今の月より後の月は今の月に戻す', () => {
            expect(parseMonthParam('2099-01', NOW)).toBe('2026-11');
        });

        it('月が 13 の不正な値は今の月に戻す', () => {
            expect(parseMonthParam('2026-13', NOW)).toBe('2026-11');
        });

        it('形式が違う値は今の月に戻す', () => {
            expect(parseMonthParam('abc', NOW)).toBe('2026-11');
        });

        it('月が 1 桁の値は今の月に戻す（YYYY-MM のみ有効）', () => {
            expect(parseMonthParam('2026-1', NOW)).toBe('2026-11');
        });

        it('未指定は今の月を返す', () => {
            expect(parseMonthParam(undefined, NOW)).toBe('2026-11');
        });
    });

    describe('monthPeriod', () => {
        it('月の 1 日から末日までを返す', () => {
            expect(monthPeriod('2026-02')).toEqual({
                from: '2026-02-01',
                to: '2026-02-28',
            });
        });

        it('うるう年の 2 月は末日が 29 日になる', () => {
            expect(monthPeriod('2028-02').to).toBe('2028-02-29');
        });

        it('31 日の月は末日が 31 日になる', () => {
            expect(monthPeriod('2026-12').to).toBe('2026-12-31');
        });
    });

    describe('shiftMonth', () => {
        it('1 月から 1 か月戻すと前年 12 月になる', () => {
            expect(shiftMonth('2026-01', -1)).toBe('2025-12');
        });

        it('12 月から 1 か月進めると翌年 1 月になる', () => {
            expect(shiftMonth('2026-12', 1)).toBe('2027-01');
        });

        it('通常の月は前後に 1 か月ずれる', () => {
            expect(shiftMonth('2026-11', 1)).toBe('2026-12');
            expect(shiftMonth('2026-11', -1)).toBe('2026-10');
        });
    });

    describe('buildMonthWeeks', () => {
        it('2026-11 は月曜始まりで 6 週になり、各週は 7 日分になる', () => {
            const weeks = buildMonthWeeks('2026-11');
            expect(weeks).toHaveLength(6);
            weeks.forEach((week) => expect(week).toHaveLength(7));
        });

        it('2026-11 の 1 週目は 11/1（日曜）だけが入り、他は null になる', () => {
            expect(buildMonthWeeks('2026-11')[0]).toEqual([
                null,
                null,
                null,
                null,
                null,
                null,
                '2026-11-01',
            ]);
        });

        it('2026-11 の最終週は 11/30（月曜）だけが入り、他は null になる', () => {
            expect(buildMonthWeeks('2026-11')[5]).toEqual([
                '2026-11-30',
                null,
                null,
                null,
                null,
                null,
                null,
            ]);
        });

        it('月曜が 1 日の月は最初の週の先頭が 1 日になる', () => {
            expect(buildMonthWeeks('2026-06')[0][0]).toBe('2026-06-01');
        });
    });
});
