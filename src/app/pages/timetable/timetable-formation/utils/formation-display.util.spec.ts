import { formatClock, toZeroBasedDays } from './formation-display.util';

describe('formatClock', () => {
    it('days=1 の 7:07 発を 07:07 と出す', () => {
        expect(formatClock(1, '07:07:00')).toBe('07:07');
    });

    it('days=2 の 0:30 発を 24:30 と出す', () => {
        expect(formatClock(2, '00:30:00')).toBe('24:30');
    });

    it('days が無ければその日（1）として出す', () => {
        expect(formatClock(undefined, '07:07:00')).toBe('07:07');
    });

    it('時刻が無ければ空', () => {
        expect(formatClock(1, undefined)).toBe('');
    });
});

describe('toZeroBasedDays', () => {
    it('1 始まりの days を 0 始まりにする（無ければ 0）', () => {
        expect(toZeroBasedDays(1)).toBe(0);
        expect(toZeroBasedDays(2)).toBe(1);
        expect(toZeroBasedDays(null)).toBe(0);
        expect(toZeroBasedDays(undefined)).toBe(0);
    });
});
