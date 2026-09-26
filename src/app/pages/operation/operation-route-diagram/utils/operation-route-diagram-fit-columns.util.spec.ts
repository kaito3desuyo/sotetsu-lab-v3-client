import {
    computeColumnMetrics,
    ROUTE_DIAGRAM_MIN_COLUMN_WIDTH,
    ROUTE_DIAGRAM_SIDE_PAD,
} from './operation-route-diagram-fit-columns.util';

describe('computeColumnMetrics', () => {
    it('駅数 0/1 では列間隔 0・幅は使える幅そのまま', () => {
        expect(computeColumnMetrics(0, 800)).toEqual({
            columnWidth: 0,
            leftPad: ROUTE_DIAGRAM_SIDE_PAD,
            width: 800,
        });
        expect(computeColumnMetrics(1, 800).columnWidth).toBe(0);
    });

    it('幅が足りるときは駅の列を使える幅いっぱいに広げる', () => {
        // 1312px（1440 幅のカード）に 12 駅: (1312 - 104) / 11
        const metrics = computeColumnMetrics(12, 1312);
        expect(metrics.columnWidth).toBeCloseTo((1312 - 104) / 11);
        expect(metrics.width).toBeCloseTo(1312);
    });

    it('列間隔が下限を割るときは下限で並べ、使える幅を超える（カード内で横スクロール）', () => {
        // 343px（390 幅のカード）に 12 駅
        const metrics = computeColumnMetrics(12, 343);
        expect(metrics.columnWidth).toBe(ROUTE_DIAGRAM_MIN_COLUMN_WIDTH);
        expect(metrics.width).toBe(
            ROUTE_DIAGRAM_SIDE_PAD * 2 + ROUTE_DIAGRAM_MIN_COLUMN_WIDTH * 11,
        );
        expect(metrics.width).toBeGreaterThan(343);
    });
});
