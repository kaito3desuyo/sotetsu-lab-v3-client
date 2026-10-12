import { calculateDayCountFromToday } from './calculate-day-count-from-today';

describe('calculateDayCountFromToday', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    function at(now: Date): void {
        jest.useFakeTimers({ now });
    }

    it('同じ営業日の目撃は 0', () => {
        at(new Date(2026, 9, 8, 10, 0));

        expect(
            calculateDayCountFromToday(
                new Date(2026, 9, 8, 6, 31).toISOString(),
            ),
        ).toBe(0);
    });

    it('前の営業日の目撃は 1', () => {
        at(new Date(2026, 9, 8, 10, 0));

        expect(
            calculateDayCountFromToday(
                new Date(2026, 9, 7, 23, 0).toISOString(),
            ),
        ).toBe(1);
    });

    it('4 時より前の目撃は前日の営業日に数える', () => {
        at(new Date(2026, 9, 8, 10, 0));

        expect(
            calculateDayCountFromToday(
                new Date(2026, 9, 8, 3, 59).toISOString(),
            ),
        ).toBe(1);
    });

    it('今が 4 時より前なら、今も前日の営業日に数える', () => {
        at(new Date(2026, 9, 8, 2, 0));

        expect(
            calculateDayCountFromToday(
                new Date(2026, 9, 7, 12, 0).toISOString(),
            ),
        ).toBe(0);
    });

    it('10 日前の目撃は 10', () => {
        at(new Date(2026, 9, 8, 10, 0));

        expect(
            calculateDayCountFromToday(
                new Date(2026, 8, 28, 12, 0).toISOString(),
            ),
        ).toBe(10);
    });

    it('目撃が無ければ NaN（今日の目撃と見分けられるように）', () => {
        at(new Date(2026, 9, 8, 10, 0));

        expect(calculateDayCountFromToday(null)).toBeNaN();
        expect(calculateDayCountFromToday(undefined)).toBeNaN();
    });
});
