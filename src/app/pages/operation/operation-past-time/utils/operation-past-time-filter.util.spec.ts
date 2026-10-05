import { matchesAgencyFilter } from './operation-past-time-filter.util';

describe('operation-past-time-filter.util', () => {
    describe('matchesAgencyFilter', () => {
        it('未選択（空配列）時は常に true（全編成行を表示）', () => {
            expect(matchesAgencyFilter('agency-1', [])).toBe(true);
        });

        it('選択会社に属する agencyId は true', () => {
            expect(
                matchesAgencyFilter('agency-1', ['agency-1', 'agency-2']),
            ).toBe(true);
        });

        it('選択会社に属さない agencyId は false', () => {
            expect(matchesAgencyFilter('agency-3', ['agency-1'])).toBe(false);
        });

        it('agencyId が解決できない場合は false', () => {
            expect(matchesAgencyFilter(undefined, ['agency-1'])).toBe(false);
        });

        it('複数選択時は OR 判定', () => {
            expect(
                matchesAgencyFilter('agency-2', ['agency-1', 'agency-2']),
            ).toBe(true);
        });
    });
});
