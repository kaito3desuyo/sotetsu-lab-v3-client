import {
    computeDefaultWindowStartHour,
    formatWindowValue,
    generateDiagramWindowOptions,
    parseWindowStartHour,
} from './generate-diagram-window-options.util';

describe('generateDiagramWindowOptions', () => {
    it('4時始まり〜25時始まりまでの1時間刻みの選択肢を生成する', () => {
        const options = generateDiagramWindowOptions();

        expect(options[0]).toEqual({
            value: '0400-0500',
            label: '4:00〜5:00',
            startHour: 4,
        });
        expect(options[options.length - 1]).toEqual({
            value: '2500-2600',
            label: '25:00〜26:00',
            startHour: 25,
        });
        expect(options).toHaveLength(22);
    });
});

describe('computeDefaultWindowStartHour', () => {
    it('日中の時刻はその時の値になる', () => {
        expect(computeDefaultWindowStartHour(new Date(2026, 6, 4, 14, 23))).toBe(
            14,
        );
    });

    it('4時より前は24時台に繰り上がる（鉄道日境界）', () => {
        expect(computeDefaultWindowStartHour(new Date(2026, 6, 4, 1, 0))).toBe(
            25,
        );
    });

    it('上限（25）を超えない', () => {
        expect(computeDefaultWindowStartHour(new Date(2026, 6, 4, 3, 59))).toBe(
            25,
        );
    });
});

describe('parseWindowStartHour', () => {
    it('window 値から開始時を取り出す', () => {
        expect(parseWindowStartHour('0700-0800')).toBe(7);
    });

    it('不正な値は undefined を返す', () => {
        expect(parseWindowStartHour('invalid')).toBeUndefined();
        expect(parseWindowStartHour(null)).toBeUndefined();
    });
});

describe('formatWindowValue', () => {
    it('開始時から window 値を生成する', () => {
        expect(formatWindowValue(7)).toBe('0700-0800');
        expect(formatWindowValue(25)).toBe('2500-2600');
    });
});
