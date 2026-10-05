import { classifyBandStyle } from './operation-route-diagram-classify-band-style.util';

describe('classifyBandStyle', () => {
    // モック04実測の裁定（2026-07-16）: 優等も白地+種別色枠で描くため、
    // 急行/特急は旅客列車として standard に分類する（塗り分岐は撤去済み）。
    it('特急を standard に分類する（白地+種別色枠。塗り分けしない）', () => {
        expect(classifyBandStyle('特急')).toBe('standard');
    });

    it('急行を standard に分類する（白地+種別色枠。塗り分けしない）', () => {
        expect(classifyBandStyle('急行')).toBe('standard');
    });

    it('通勤特急/通勤急行系も standard に分類する', () => {
        expect(classifyBandStyle('通勤特急')).toBe('standard');
        expect(classifyBandStyle('通勤急行')).toBe('standard');
    });

    it('系統サフィックス付きの優等も standard に分類する（例: 特急（SO→TY）)', () => {
        expect(classifyBandStyle('特急（SO→TY）')).toBe('standard');
        expect(classifyBandStyle('急行(SO)')).toBe('standard');
    });

    it('回送を nonRevenue に分類する（旅客列車と区別する唯一の分岐）', () => {
        expect(classifyBandStyle('回送')).toBe('nonRevenue');
    });

    it('快速を standard に分類する', () => {
        expect(classifyBandStyle('快速')).toBe('standard');
    });

    it('各停/各駅停車を standard に分類する', () => {
        expect(classifyBandStyle('各停')).toBe('standard');
        expect(classifyBandStyle('各駅停車')).toBe('standard');
    });

    it('null/undefined は standard を返す', () => {
        expect(classifyBandStyle(null)).toBe('standard');
        expect(classifyBandStyle(undefined)).toBe('standard');
    });
});
