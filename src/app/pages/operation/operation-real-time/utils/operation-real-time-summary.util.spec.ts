import { formatRealTimeSummary } from './operation-real-time-summary.util';

const agencies = [
    { agencyId: 'a-sotetsu', agencyName: '相鉄' },
    { agencyId: 'a-tokyu', agencyName: '東急' },
];

describe('formatRealTimeSummary', () => {
    it('何も選んでいなければ「絞り込み：なし」（件数は出さない）', () => {
        expect(
            formatRealTimeSummary({
                agencies,
                selectedAgencyIds: [],
                selectedGroupNames: [],
                shown: 120,
                total: 120,
            }),
        ).toBe('絞り込み：なし');
    });

    it('会社 → 運用群の順に並べ、件数を付ける', () => {
        expect(
            formatRealTimeSummary({
                agencies,
                selectedAgencyIds: ['a-tokyu'],
                selectedGroupNames: ['K群（目黒線）'],
                shown: 36,
                total: 120,
            }),
        ).toBe('絞り込み中：東急・K群（目黒線） 36/120 運用');
    });

    it('名前を引けない会社 ID は飛ばす', () => {
        expect(
            formatRealTimeSummary({
                agencies,
                selectedAgencyIds: ['gone'],
                selectedGroupNames: ['1群'],
                shown: 5,
                total: 120,
            }),
        ).toBe('絞り込み中：1群 5/120 運用');
    });
});
