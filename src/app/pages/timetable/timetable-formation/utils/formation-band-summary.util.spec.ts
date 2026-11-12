import { formatFormationBandSummary } from './formation-band-summary.util';

describe('formatFormationBandSummary', () => {
    it('編成番号・日付・日の種類と、駅で絞っていないことを並べる', () => {
        expect(
            formatFormationBandSummary({
                formationNumber: '8713',
                date: '2026-11-12',
                dateKind: 'today',
                stationName: null,
            }),
        ).toBe('8713 11/12（今日） 絞り込み：なし');
    });

    it('駅で絞っているときは駅名を出す', () => {
        expect(
            formatFormationBandSummary({
                formationNumber: '8713',
                date: '2026-11-11',
                dateKind: 'past',
                stationName: '二俣川',
            }),
        ).toBe('8713 11/11 絞り込み中：二俣川');
    });

    it('明日は「明日（見込み）」と添える', () => {
        expect(
            formatFormationBandSummary({
                formationNumber: '8713',
                date: '2026-11-13',
                dateKind: 'tomorrow',
                stationName: null,
            }),
        ).toBe('8713 11/13（明日・見込み） 絞り込み：なし');
    });

    it('編成番号が無いときは入れるよう促す', () => {
        expect(
            formatFormationBandSummary({
                formationNumber: null,
                date: '2026-11-12',
                dateKind: 'today',
                stationName: null,
            }),
        ).toBe('編成番号を入れてください');
    });
});
