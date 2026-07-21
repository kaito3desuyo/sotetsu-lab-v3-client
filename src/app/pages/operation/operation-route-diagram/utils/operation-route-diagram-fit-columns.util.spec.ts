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

    it('99文書追補8 §1（P9-10）: モック04相当（11駅）では列間隔40px固定だと必要幅(438px)が目標幅(390px)を上回る（横スクロールに委ねる）', () => {
        const metrics = computeColumnMetrics(11);
        expect(metrics.columnWidth).toBe(40);
        // 40px * 10gaps + 24(leftPad) + 14(rightPad) = 438px > 390px。
        expect(metrics.width).toBe(438);
        expect(metrics.width).toBeGreaterThan(ROUTE_DIAGRAM_TARGET_WIDTH);
    });

    it('99文書追補8 §1（P9-10）: 14駅では列間隔40px固定のため必要幅が目標幅を超え、目標幅(390px)を上回る（横スクロールに委ねる）', () => {
        const metrics = computeColumnMetrics(14);
        expect(metrics.columnWidth).toBe(40);
        expect(metrics.width).toBeGreaterThan(ROUTE_DIAGRAM_TARGET_WIDTH);
    });

    it('99文書追補8 §1（P9-10）: 駅数が非常に多い場合も列間隔は40px固定のまま、幅は目標幅を超える（横スクロールのフォールバック）', () => {
        const metrics = computeColumnMetrics(40);
        expect(metrics.columnWidth).toBe(40);
        expect(metrics.width).toBeGreaterThan(ROUTE_DIAGRAM_TARGET_WIDTH);
    });

    it('99文書追補8 §1（P9-10）: 列間隔は駅数に関わらず常に40px固定になる（390pxへのフィット優先は撤回した）', () => {
        const a = computeColumnMetrics(5);
        const b = computeColumnMetrics(10);
        const c = computeColumnMetrics(40);
        expect(a.columnWidth).toBe(40);
        expect(b.columnWidth).toBe(40);
        expect(c.columnWidth).toBe(40);
    });

    it('99文書追補8 §1（P9-10）: 駅数が少なく必要幅が目標幅を下回る場合のみ、目標幅(390px)を下限として使う', () => {
        const metrics = computeColumnMetrics(5);
        // 40px * 4gaps + 24(leftPad) + 14(rightPad) = 198px < 390px なので下限の390pxが採用される。
        expect(metrics.width).toBe(ROUTE_DIAGRAM_TARGET_WIDTH);
    });
});
