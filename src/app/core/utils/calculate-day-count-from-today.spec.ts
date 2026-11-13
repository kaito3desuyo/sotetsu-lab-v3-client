import { calculateDayCountFromToday } from './calculate-day-count-from-today';

describe('calculateDayCountFromToday', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    /** 今を指定の時点にする（時点は Z で書き、端末の時刻帯に左右されない） */
    function at(now: string): void {
        jest.useFakeTimers({ now: new Date(now) });
    }

    it('日本時間 4 時の境目で営業日が替わる（端末の時刻帯によらない）', () => {
        at('2026-11-13T01:30:00Z');

        expect(calculateDayCountFromToday('2026-11-12T18:59:00Z')).toBe(1);
        expect(calculateDayCountFromToday('2026-11-12T19:00:00Z')).toBe(0);
    });

    it('同じ営業日の目撃は 0', () => {
        at('2026-10-08T01:00:00Z'); // 日本時間 10-08 10:00

        expect(calculateDayCountFromToday('2026-10-07T21:31:00Z')).toBe(0);
    });

    it('前の営業日の目撃は 1', () => {
        at('2026-10-08T01:00:00Z');

        expect(calculateDayCountFromToday('2026-10-07T14:00:00Z')).toBe(1);
    });

    it('4 時より前の目撃は前日の営業日に数える', () => {
        at('2026-10-08T01:00:00Z');

        // 日本時間 10-08 03:59
        expect(calculateDayCountFromToday('2026-10-07T18:59:00Z')).toBe(1);
    });

    it('今が 4 時より前なら、今も前日の営業日に数える', () => {
        at('2026-10-07T17:00:00Z'); // 日本時間 10-08 02:00

        // 日本時間 10-07 12:00
        expect(calculateDayCountFromToday('2026-10-07T03:00:00Z')).toBe(0);
    });

    it('10 日前の目撃は 10', () => {
        at('2026-10-08T01:00:00Z');

        // 日本時間 09-28 12:00
        expect(calculateDayCountFromToday('2026-09-28T03:00:00Z')).toBe(10);
    });

    it('目撃が無ければ NaN（今日の目撃と見分けられるように）', () => {
        at('2026-10-08T01:00:00Z');

        expect(calculateDayCountFromToday(null)).toBeNaN();
        expect(calculateDayCountFromToday(undefined)).toBeNaN();
    });
});
