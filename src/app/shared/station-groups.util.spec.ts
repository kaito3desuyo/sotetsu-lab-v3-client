import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { buildStationGroups } from './station-groups.util';

const agencies = [
    { agencyId: 'a-sotetsu', agencyName: '相鉄' },
    { agencyId: 'a-tokyu', agencyName: '東急' },
] as AgencyDetailsDto[];

const station = (stationId: string, stationName: string) => ({
    routeStationListId: `rsl-${stationId}`,
    station: { stationId, stationName },
});

describe('buildStationGroups', () => {
    it('路線ごとに「会社名 路線名」の見出しと駅を並び順どおりに返す', () => {
        const routes = [
            {
                routeId: 'r-main',
                agencyId: 'a-sotetsu',
                routeName: '本線',
                routeStationLists: [
                    station('s-yokohama', '横浜'),
                    station('s-hiranumabashi', '平沼橋'),
                ],
            },
            {
                routeId: 'r-toyoko',
                agencyId: 'a-tokyu',
                routeName: '東横線',
                routeStationLists: [station('s-yokohama', '横浜')],
            },
        ] as RouteDetailsDto[];

        expect(buildStationGroups(routes, agencies)).toEqual([
            {
                routeId: 'r-main',
                label: '相鉄 本線',
                stations: [
                    { stationId: 's-yokohama', stationName: '横浜' },
                    { stationId: 's-hiranumabashi', stationName: '平沼橋' },
                ],
            },
            {
                routeId: 'r-toyoko',
                label: '東急 東横線',
                stations: [{ stationId: 's-yokohama', stationName: '横浜' }],
            },
        ]);
    });

    it('会社が解決できなければ路線名だけ', () => {
        const routes = [
            {
                routeId: 'r-x',
                agencyId: 'a-unknown',
                routeName: '埼京線',
                routeStationLists: [],
            },
        ] as RouteDetailsDto[];

        expect(buildStationGroups(routes, agencies)[0].label).toBe('埼京線');
    });

    it('会社は直通を始めた順にまとめ、会社の中は routes の（系統）順を保つ', () => {
        const withJr = [
            ...agencies,
            { agencyId: 'a-jre', agencyName: 'JR東日本' },
        ] as AgencyDetailsDto[];
        // 系統順: 相鉄 → 東急 → JR → 相鉄
        const routes = [
            { routeId: 'r-main', agencyId: 'a-sotetsu', routeName: '本線' },
            { routeId: 'r-toyoko', agencyId: 'a-tokyu', routeName: '東横線' },
            { routeId: 'r-saikyo', agencyId: 'a-jre', routeName: '埼京線' },
            {
                routeId: 'r-izumino',
                agencyId: 'a-sotetsu',
                routeName: 'いずみ野線',
            },
        ] as RouteDetailsDto[];

        expect(
            buildStationGroups(routes, withJr).map((group) => group.label),
        ).toEqual([
            '相鉄 本線',
            '相鉄 いずみ野線',
            'JR東日本 埼京線',
            '東急 東横線',
        ]);
    });
});
