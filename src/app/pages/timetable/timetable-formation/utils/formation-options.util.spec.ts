import { groupFormationOptions } from './formation-options.util';

const AGENCIES = [
    { agencyId: 'sotetsu', agencyName: '相鉄' },
    { agencyId: 'jr', agencyName: 'JR東日本' },
] as never;

const f = (formationNumber: string, agencyId: string, vehicleType?: string) =>
    ({
        formationId: formationNumber,
        formationNumber,
        agencyId,
        vehicleType,
    }) as never;

describe('groupFormationOptions', () => {
    const sorted = [
        f('8713', 'sotetsu', '8000'),
        f('8714', 'sotetsu', '8000'),
        f('10701', 'sotetsu', '10000'),
        f('ハエ101', 'jr', 'E233-7000'),
    ];

    it('並びを保ったまま、会社と形式ごとにまとめる', () => {
        const groups = groupFormationOptions(sorted, AGENCIES, '');
        expect(groups.map((g) => g.label)).toEqual([
            '相鉄 8000',
            '相鉄 10000',
            'JR東日本 E233-7000',
        ]);
        expect(groups[0].formationNumbers).toEqual(['8713', '8714']);
    });

    it('打った文字を含む編成だけを残し、空になったまとまりは出さない', () => {
        const groups = groupFormationOptions(sorted, AGENCIES, '871');
        expect(groups).toEqual([
            { label: '相鉄 8000', formationNumbers: ['8713', '8714'] },
        ]);
    });

    it('全角の数字や小文字で打っても合う', () => {
        expect(
            groupFormationOptions(sorted, AGENCIES, '１０７')[0]
                .formationNumbers,
        ).toEqual(['10701']);
    });

    it('形式が無い編成は会社名だけでまとめる', () => {
        const groups = groupFormationOptions(
            [f('5001', 'sotetsu')],
            AGENCIES,
            '',
        );
        expect(groups[0].label).toBe('相鉄');
    });
});
