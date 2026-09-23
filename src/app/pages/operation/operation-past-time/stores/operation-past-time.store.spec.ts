import { generateDates } from './operation-past-time.store';

describe('generateDates', () => {
    it('基準日から先へ N 日間を返す', () => {
        expect(generateDates('2026-09-21', 3)).toEqual([
            '2026-09-21',
            '2026-09-22',
            '2026-09-23',
        ]);
    });

    it('月をまたいでも続ける', () => {
        expect(generateDates('2026-09-30', 2)).toEqual([
            '2026-09-30',
            '2026-10-01',
        ]);
    });

    it('基準日か日数が無ければ空', () => {
        expect(generateDates(null, 7)).toEqual([]);
        expect(generateDates('2026-09-23', null)).toEqual([]);
    });
});
