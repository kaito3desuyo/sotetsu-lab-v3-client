import {
    formatTimeParam,
    fromTimeInputValue,
    parseTimeParam,
    toDateWithTime,
    toTimeInputValue,
} from './parse-time-param.util';

describe('parseTimeParam', () => {
    it('"HHmm" 形式をパースする', () => {
        expect(parseTimeParam('0730')).toEqual({ hours: 7, minutes: 30 });
    });

    it('null は undefined を返す', () => {
        expect(parseTimeParam(null)).toBeUndefined();
    });

    it('4 桁以外の形式は undefined を返す', () => {
        expect(parseTimeParam('7:30')).toBeUndefined();
        expect(parseTimeParam('730')).toBeUndefined();
    });

    it('範囲外の時分は undefined を返す', () => {
        expect(parseTimeParam('2460')).toBeUndefined();
        expect(parseTimeParam('9999')).toBeUndefined();
    });

    it('境界値 0000 / 2359 は正しくパースする', () => {
        expect(parseTimeParam('0000')).toEqual({ hours: 0, minutes: 0 });
        expect(parseTimeParam('2359')).toEqual({ hours: 23, minutes: 59 });
    });
});

describe('formatTimeParam', () => {
    it('2 桁ゼロ埋めで "HHmm" にする', () => {
        expect(formatTimeParam({ hours: 7, minutes: 5 })).toBe('0705');
    });
});

describe('toTimeInputValue / fromTimeInputValue', () => {
    it('相互変換できる', () => {
        const time = { hours: 14, minutes: 2 };
        expect(toTimeInputValue(time)).toBe('14:02');
        expect(fromTimeInputValue('14:02')).toEqual(time);
    });

    it('不正な形式は undefined を返す', () => {
        expect(fromTimeInputValue('1402')).toBeUndefined();
    });
});

describe('toDateWithTime', () => {
    it('anchor の日付部分を保ったまま時分を上書きする', () => {
        const anchor = new Date(2026, 6, 4, 23, 59, 59);
        const result = toDateWithTime(anchor, { hours: 7, minutes: 30 });

        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(6);
        expect(result.getDate()).toBe(4);
        expect(result.getHours()).toBe(7);
        expect(result.getMinutes()).toBe(30);
        expect(result.getSeconds()).toBe(0);
    });
});
