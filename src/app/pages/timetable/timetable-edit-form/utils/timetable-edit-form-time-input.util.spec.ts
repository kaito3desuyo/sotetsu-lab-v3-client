import {
    normalizeTimeDigits,
    toEditDigits,
} from './timetable-edit-form-time-input.util';

describe('normalizeTimeDigits', () => {
    it('4 桁を HH:mm にする', () => {
        expect(normalizeTimeDigits('1154')).toBe('11:54');
        expect(normalizeTimeDigits('0003')).toBe('00:03');
    });

    it('3 桁は先頭に 0 を足す', () => {
        expect(normalizeTimeDigits('930')).toBe('09:30');
    });

    it('コロン入りでも数字だけを読む', () => {
        expect(normalizeTimeDigits('11:54')).toBe('11:54');
    });

    it('空は null（時刻を消す）', () => {
        expect(normalizeTimeDigits('')).toBeNull();
        expect(normalizeTimeDigits(null)).toBeNull();
        expect(normalizeTimeDigits(undefined)).toBeNull();
    });

    it('桁数が合わない・時分が範囲外なら undefined（読めない）', () => {
        expect(normalizeTimeDigits('9')).toBeUndefined();
        expect(normalizeTimeDigits('99')).toBeUndefined();
        expect(normalizeTimeDigits('12345')).toBeUndefined();
        expect(normalizeTimeDigits('2400')).toBeUndefined();
        expect(normalizeTimeDigits('1260')).toBeUndefined();
    });
});

describe('toEditDigits', () => {
    it('HH:mm を数字 4 桁にする', () => {
        expect(toEditDigits('11:54')).toBe('1154');
    });

    it('空は空文字', () => {
        expect(toEditDigits(null)).toBe('');
        expect(toEditDigits('')).toBe('');
    });
});
