import {
    filterRealTimeOperations,
    matchesAgencyFilter,
} from './operation-real-time-filter.util';

describe('matchesAgencyFilter', () => {
    it('未選択（空配列）時は常に true', () => {
        expect(matchesAgencyFilter('agency-1', [])).toBe(true);
        expect(matchesAgencyFilter(undefined, [])).toBe(true);
    });

    it('1社選択時、一致する agencyId のみ true', () => {
        expect(matchesAgencyFilter('agency-1', ['agency-1'])).toBe(true);
        expect(matchesAgencyFilter('agency-2', ['agency-1'])).toBe(false);
    });

    it('複数社選択時は OR', () => {
        expect(matchesAgencyFilter('agency-2', ['agency-1', 'agency-2'])).toBe(
            true,
        );
        expect(matchesAgencyFilter('agency-3', ['agency-1', 'agency-2'])).toBe(
            false,
        );
    });

    it('agencyId が解決できない場合、絞り込み中は除外', () => {
        expect(matchesAgencyFilter(undefined, ['agency-1'])).toBe(false);
    });
});

describe('filterRealTimeOperations', () => {
    const operations = [
        { operationNumber: '11' },
        { operationNumber: '01K' },
        { operationNumber: '51K' },
    ];
    const crossSections = {
        '11': { expectedSighting: { formation: { formationId: 'f1' } } },
        '01K': { expectedSighting: { formation: { formationId: 'f2' } } },
    };
    const formations = [
        { formationId: 'f1', agencyId: 'a-sotetsu' },
        { formationId: 'f2', agencyId: 'a-tokyu' },
    ];

    it('空なら全部', () => {
        expect(
            filterRealTimeOperations(
                operations,
                [],
                [],
                crossSections,
                formations,
            ),
        ).toHaveLength(3);
    });
    it('会社で絞ると予想編成の会社で判定し、編成が分からない運用は外す', () => {
        expect(
            filterRealTimeOperations(
                operations,
                ['a-tokyu'],
                [],
                crossSections,
                formations,
            ).map((o) => o.operationNumber),
        ).toEqual(['01K']);
    });
    it('運用群で絞る', () => {
        expect(
            filterRealTimeOperations(
                operations,
                [],
                ['K群（目黒線）'],
                crossSections,
                formations,
            ).map((o) => o.operationNumber),
        ).toEqual(['01K']);
    });
});
