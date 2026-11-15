import { toAccessibleNumber } from './accessible-number.util';

describe('toAccessibleNumber', () => {
    it('接頭辞と番号を半角空白 1 つでつなぐ', () => {
        expect(toAccessibleNumber('運用', '54')).toBe('運用 54');
        expect(toAccessibleNumber('運用', '01K')).toBe('運用 01K');
    });

    it('番号の終わりの「?」は外して、後ろに「（推測）」を付ける', () => {
        expect(toAccessibleNumber('編成', '10706?')).toBe('編成 10706（推測）');
    });

    it('推測の印を別に渡すと、番号に「?」が無くても「（推測）」を付ける', () => {
        expect(toAccessibleNumber('運用', '11', true)).toBe('運用 11（推測）');
        expect(toAccessibleNumber('運用', '11?', true)).toBe('運用 11（推測）');
    });
});
