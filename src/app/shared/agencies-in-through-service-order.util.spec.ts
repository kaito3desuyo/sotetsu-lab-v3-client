import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import {
    agenciesInThroughServiceOrder,
    sortByThroughServiceAgency,
} from './agencies-in-through-service-order.util';

describe('agenciesInThroughServiceOrder', () => {
    const agency = (agencyId: string, agencyName: string) =>
        ({ agencyId, agencyName }) as AgencyDetailsDto;

    it('相鉄と直通を始めた順に並べる（API の返す順・路線の順によらない）', () => {
        // DB の登録順（API の返す順）をわざと崩しておく
        const agencies = [
            agency('seibu', '西武'),
            agency('tokyu', '東急'),
            agency('tokyo-rinkai', '東臨'),
            agency('sotetsu', '相鉄'),
            agency('jre', 'JR東日本'),
        ];
        const routes = [
            { agencyId: 'sotetsu' },
            { agencyId: 'tokyu' },
            { agencyId: 'seibu' },
            { agencyId: 'tokyo-rinkai' },
            { agencyId: 'jre' },
        ];
        expect(
            agenciesInThroughServiceOrder(agencies, routes).map(
                (a) => a.agencyName,
            ),
        ).toEqual(['相鉄', 'JR東日本', '東臨', '東急', '西武']);
    });

    it('一覧に無い会社は後ろに付け、路線の順、それも無ければ元の順', () => {
        const agencies = [
            agency('x', '新会社X'),
            agency('y', '新会社Y'),
            agency('sotetsu', '相鉄'),
            agency('z', '路線なし'),
        ];
        const routes = [
            { agencyId: 'sotetsu' },
            { agencyId: 'y' },
            { agencyId: 'x' },
        ];
        expect(
            agenciesInThroughServiceOrder(agencies, routes).map(
                (a) => a.agencyName,
            ),
        ).toEqual(['相鉄', '新会社Y', '新会社X', '路線なし']);
    });

    it('東急の先の会社は 東急 → 横高 → 東京メトロ → 東武 → 西武 → 埼玉高速 → 都営', () => {
        const names = [
            '都営',
            '埼玉高速',
            '西武',
            '東武',
            '東京メトロ',
            '横高',
            '東急',
        ];
        const agencies = names.map((name) => agency(name, name));
        expect(
            agenciesInThroughServiceOrder(agencies, []).map(
                (a) => a.agencyName,
            ),
        ).toEqual([...names].reverse());
    });
});

describe('sortByThroughServiceAgency', () => {
    const agencies = [
        { agencyId: 'sotetsu', agencyName: '相鉄' },
        { agencyId: 'tokyu', agencyName: '東急' },
        { agencyId: 'jre', agencyName: 'JR東日本' },
    ] as AgencyDetailsDto[];

    it('会社を直通を始めた順にまとめ、会社の中は元の（系統）順を保つ', () => {
        // 系統順: 相鉄 → 東急 → 東急 → JR
        const routes = [
            { name: '本線', agencyId: 'sotetsu' },
            { name: '東急新横浜線', agencyId: 'tokyu' },
            { name: '東横線', agencyId: 'tokyu' },
            { name: '埼京線', agencyId: 'jre' },
            { name: 'いずみ野線', agencyId: 'sotetsu' },
        ];
        expect(
            sortByThroughServiceAgency(
                routes,
                (route) => route.agencyId,
                agencies,
            ).map((route) => route.name),
        ).toEqual(['本線', 'いずみ野線', '埼京線', '東急新横浜線', '東横線']);
    });
});
