import { formatOperationTableSummary } from './operation-table-summary.util';

const calendar = { calendarName: '平日', startDate: '2026-03-14' };

describe('formatOperationTableSummary', () => {
    it('ダイヤと「絞り込み：なし」', () => {
        expect(
            formatOperationTableSummary({
                calendar,
                selectedGroupNames: [],
                shown: 90,
                total: 90,
            }),
        ).toBe('2026/3/14改正 平日 絞り込み：なし');
    });
    it('絞り込み中は件数を付ける', () => {
        expect(
            formatOperationTableSummary({
                calendar,
                selectedGroupNames: ['G群（東横線）'],
                shown: 5,
                total: 90,
            }),
        ).toBe('2026/3/14改正 平日 絞り込み中：G群（東横線） 5/90 運用');
    });
    it('ダイヤがまだ無ければ絞り込みだけ', () => {
        expect(
            formatOperationTableSummary({
                calendar: null,
                selectedGroupNames: [],
                shown: 0,
                total: 0,
            }),
        ).toBe('絞り込み：なし');
    });
});
