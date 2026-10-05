import {
    DIAGRAM_JUMP_HOURS,
    DIAGRAM_TOTAL_MINUTES,
    defaultStartMinute,
    formatHourLabel,
    formatTimeParam,
    nextZoomStep,
    parseLegacyWindowParam,
    parseTimeParam,
    railwayMinuteOfDay,
    resolveAxisPxPerMinute,
} from './diagram-timeline.util';

describe('diagram-timeline.util', () => {
    it('横軸は 4:00〜26:00 の 1320 分。跳び先は 4〜25 時', () => {
        expect(DIAGRAM_TOTAL_MINUTES).toBe(1320);
        expect(DIAGRAM_JUMP_HOURS[0]).toBe(4);
        expect(DIAGRAM_JUMP_HOURS[DIAGRAM_JUMP_HOURS.length - 1]).toBe(25);
    });

    it('railwayMinuteOfDay: 4 時からの分。0〜3 時は 24〜27 時として数える', () => {
        expect(railwayMinuteOfDay(new Date(2026, 8, 26, 4, 0))).toBe(0);
        expect(railwayMinuteOfDay(new Date(2026, 8, 26, 18, 30))).toBe(870);
        expect(railwayMinuteOfDay(new Date(2026, 8, 27, 1, 15))).toBe(1275);
    });

    it('defaultStartMinute: 今の 30 分前。0〜1260 分（4:00〜25:00）に収める', () => {
        expect(defaultStartMinute(new Date(2026, 8, 26, 18, 30))).toBe(840);
        expect(defaultStartMinute(new Date(2026, 8, 26, 4, 10))).toBe(0);
        expect(defaultStartMinute(new Date(2026, 8, 27, 1, 50))).toBe(1260);
    });

    it('parseTimeParam: HHmm を 4 時からの分に。範囲外・不正は undefined', () => {
        expect(parseTimeParam('1830')).toBe(870);
        expect(parseTimeParam('0400')).toBe(0);
        expect(parseTimeParam('2545')).toBe(1305);
        expect(parseTimeParam('0359')).toBeUndefined();
        expect(parseTimeParam('2601')).toBeUndefined();
        expect(parseTimeParam('1860')).toBeUndefined();
        expect(parseTimeParam('18:30')).toBeUndefined();
        expect(parseTimeParam(null)).toBeUndefined();
    });

    it('formatTimeParam: 4 時からの分を HHmm に（24 時超えはそのまま）', () => {
        expect(formatTimeParam(870)).toBe('1830');
        expect(formatTimeParam(0)).toBe('0400');
        expect(formatTimeParam(1305)).toBe('2545');
        expect(formatTimeParam(870.7)).toBe('1830');
    });

    it('parseLegacyWindowParam: 古い window=HH00-HH00 の開始時を分に', () => {
        expect(parseLegacyWindowParam('1800-1900')).toBe(840);
        expect(parseLegacyWindowParam('2500-2600')).toBe(1260);
        expect(parseLegacyWindowParam('0300-0400')).toBeUndefined();
        expect(parseLegacyWindowParam('abc')).toBeUndefined();
        expect(parseLegacyWindowParam(null)).toBeUndefined();
    });

    it('formatHourLabel: 分を「18:00」の形に', () => {
        expect(formatHourLabel(840)).toBe('18:00');
        expect(formatHourLabel(1290)).toBe('25:30');
    });

    it('nextZoomStep: 段を 1 つ移る。端では止まる。段の間の値からは近い側の段へ', () => {
        expect(nextZoomStep(10, 1)).toBe(16);
        expect(nextZoomStep(10, -1)).toBe(6);
        expect(nextZoomStep(40, 1)).toBe(40);
        expect(nextZoomStep(4, -1)).toBe(4);
        expect(nextZoomStep(12, 1)).toBe(16);
        expect(nextZoomStep(12, -1)).toBe(10);
    });

    describe('resolveAxisPxPerMinute（Task 13 フィックス: 縦の縮尺の自動/手動）', () => {
        const base = {
            targetPx: 16,
            defaultValue: 6,
            min: 2,
            max: 24,
        };

        it('手動値があればそれをそのまま使う（観測が何であっても）', () => {
            expect(
                resolveAxisPxPerMinute({
                    ...base,
                    manual: 10,
                    smallestObservedGapMinutes: 2,
                }),
            ).toBe(10);
        });

        it('自動（manual=null）: 観測のある駅間の最小所要分が targetPx になるよう決める', () => {
            expect(
                resolveAxisPxPerMinute({
                    ...base,
                    manual: null,
                    smallestObservedGapMinutes: 4,
                }),
            ).toBe(4); // 16 / 4
        });

        it('自動で下限・上限を超えたら丸める', () => {
            expect(
                resolveAxisPxPerMinute({
                    ...base,
                    manual: null,
                    smallestObservedGapMinutes: 0.1, // 16/0.1=160 → 上限24
                }),
            ).toBe(24);
            expect(
                resolveAxisPxPerMinute({
                    ...base,
                    manual: null,
                    smallestObservedGapMinutes: 100, // 16/100=0.16 → 下限2
                }),
            ).toBe(2);
        });

        it('自動で観測のある駅間が1つも無ければ defaultValue にフォールバック', () => {
            expect(
                resolveAxisPxPerMinute({
                    ...base,
                    manual: null,
                    smallestObservedGapMinutes: undefined,
                }),
            ).toBe(6);
            expect(
                resolveAxisPxPerMinute({
                    ...base,
                    manual: null,
                    smallestObservedGapMinutes: 0,
                }),
            ).toBe(6);
        });
    });
});
