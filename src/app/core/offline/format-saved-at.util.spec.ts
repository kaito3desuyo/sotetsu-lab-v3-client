import { formatSavedAt } from './format-saved-at.util';

describe('formatSavedAt', () => {
    const now = new Date(2026, 9, 26, 23, 0).getTime();

    it('同じ日なら時刻だけを返す', () => {
        const savedAt = new Date(2026, 9, 26, 21, 5).getTime();
        expect(formatSavedAt(savedAt, now)).toBe('21時5分');
    });

    it('前の日なら月日と時刻を返す', () => {
        const savedAt = new Date(2026, 9, 25, 7, 30).getTime();
        expect(formatSavedAt(savedAt, now)).toBe('10月25日 7時30分');
    });
});
