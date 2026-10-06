import { filterAgenciesWithFormations } from './new-operation-post-card.store';

describe('filterAgenciesWithFormations', () => {
    const agencies = [
        { agencyId: 'sotetsu', agencyName: '相鉄' },
        { agencyId: 'jre', agencyName: 'JR東日本' },
        { agencyId: 'tokyu', agencyName: '東急' },
        { agencyId: 'metro', agencyName: '東京メトロ' },
        { agencyId: 'toei', agencyName: '都営' },
    ];

    it('今日の編成を持つ会社だけを、元の並びのまま残す', () => {
        const formations = [
            { agencyId: 'tokyu' },
            { agencyId: 'sotetsu' },
            { agencyId: 'sotetsu' },
            { agencyId: 'jre' },
        ];

        expect(
            filterAgenciesWithFormations(agencies, formations).map(
                (agency) => agency.agencyName,
            ),
        ).toEqual(['相鉄', 'JR東日本', '東急']);
    });

    it('編成をまだ取れていない（空の）ときは絞らない', () => {
        expect(filterAgenciesWithFormations(agencies, [])).toEqual(agencies);
    });
});
