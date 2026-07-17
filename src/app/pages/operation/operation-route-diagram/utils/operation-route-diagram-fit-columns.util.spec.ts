import {
    computeColumnMetrics,
    ROUTE_DIAGRAM_TARGET_WIDTH,
} from './operation-route-diagram-fit-columns.util';

describe('computeColumnMetrics', () => {
    it('駅数 0/1 では幅が目標幅ちょうどになる（列間隔 0）', () => {
        expect(computeColumnMetrics(0)).toEqual({
            columnWidth: 0,
            leftPad: 24,
            width: ROUTE_DIAGRAM_TARGET_WIDTH,
        });
        expect(computeColumnMetrics(1)).toEqual({
            columnWidth: 0,
            leftPad: 24,
            width: ROUTE_DIAGRAM_TARGET_WIDTH,
        });
    });

    it('モック04相当（11駅）で目標幅ちょうどにフィットする', () => {
        const metrics = computeColumnMetrics(11);
        expect(metrics.width).toBe(ROUTE_DIAGRAM_TARGET_WIDTH);
        expect(metrics.columnWidth).toBeGreaterThan(0);
    });

    it('14駅程度でも目標幅にフィットする（DoD: 14駅程度なら文字を縦書き圧縮してフィット）', () => {
        const metrics = computeColumnMetrics(14);
        expect(metrics.width).toBe(ROUTE_DIAGRAM_TARGET_WIDTH);
    });

    it('駅数が非常に多い場合は最小列間隔を維持し、幅は目標幅を超える（横スクロール/ピンチのフォールバック）', () => {
        const metrics = computeColumnMetrics(40);
        expect(metrics.columnWidth).toBe(22);
        expect(metrics.width).toBeGreaterThan(ROUTE_DIAGRAM_TARGET_WIDTH);
    });

    it('駅数が増えるほど列間隔が狭くなる（フィット優先の単調性）', () => {
        const a = computeColumnMetrics(5);
        const b = computeColumnMetrics(10);
        expect(b.columnWidth).toBeLessThan(a.columnWidth);
    });
});
