import { formatPastTimeSummary } from './operation-past-time-summary.util';

const agencies = [{ agencyId: 'a-tokyu', agencyName: '東急' }];

describe('formatPastTimeSummary', () => {
    it('日付と日数と絞り込み', () => {
        expect(
            formatPastTimeSummary({
                referenceDate: '2026-10-06',
                days: 7,
                agencies,
                selectedAgencyIds: ['a-tokyu'],
            }),
        ).toBe('10/6 から 7 日間 絞り込み中：東急');
    });
    it('検索前は絞り込みだけ', () => {
        expect(
            formatPastTimeSummary({
                referenceDate: null,
                days: null,
                agencies,
                selectedAgencyIds: [],
            }),
        ).toBe('絞り込み：なし');
    });
    it('名前を引けない会社 ID は飛ばし、残らなければ「なし」', () => {
        expect(
            formatPastTimeSummary({
                referenceDate: '2026-10-06',
                days: 3,
                agencies,
                selectedAgencyIds: ['gone'],
            }),
        ).toBe('10/6 から 3 日間 絞り込み：なし');
    });
});
