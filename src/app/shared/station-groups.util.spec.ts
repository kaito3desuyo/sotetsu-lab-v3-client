import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import {
    buildStationGroups,
    findNeighborStations,
    StationGroup,
} from './station-groups.util';

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
                routeName: '本線',
                stations: [
                    { stationId: 's-yokohama', stationName: '横浜' },
                    { stationId: 's-hiranumabashi', stationName: '平沼橋' },
                ],
            },
            {
                routeId: 'r-toyoko',
                label: '東急 東横線',
                routeName: '東横線',
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

describe('findNeighborStations', () => {
    const st = (stationId: string, stationName: string) =>
        ({ stationId, stationName }) as StationDetailsDto;
    const groups: StationGroup[] = [
        {
            routeId: 'main',
            label: '相鉄 本線',
            routeName: '本線',
            stations: [
                st('yokohama', '横浜'),
                st('tsurugamine', '鶴ヶ峰'),
                st('futamatagawa', '二俣川'),
                st('kibogaoka', '希望ヶ丘'),
            ],
        },
        {
            routeId: 'izumino',
            label: '相鉄 いずみ野線',
            routeName: 'いずみ野線',
            stations: [
                st('futamatagawa', '二俣川'),
                st('minamimakigahara', '南万騎が原'),
            ],
        },
        {
            routeId: 'toyoko',
            label: '東急 東横線',
            routeName: '東横線',
            stations: [st('hiyoshi', '日吉'), st('tamagawa', '多摩川')],
        },
        {
            routeId: 'meguro',
            label: '東急 目黒線',
            routeName: '目黒線',
            stations: [st('hiyoshi', '日吉'), st('tamagawa', '多摩川')],
        },
    ];

    it('分岐駅は、駅を含む路線ごとの隣を全部返す', () => {
        expect(findNeighborStations(groups, 'futamatagawa')).toEqual({
            prev: [{ id: 'tsurugamine', label: '鶴ヶ峰' }],
            next: [
                { id: 'kibogaoka', label: '希望ヶ丘' },
                { id: 'minamimakigahara', label: '南万騎が原' },
            ],
        });
    });

    it('起点の駅は前が無い', () => {
        expect(findNeighborStations(groups, 'yokohama')).toEqual({
            prev: [],
            next: [{ id: 'tsurugamine', label: '鶴ヶ峰' }],
        });
    });

    it('終点の駅は次が無い', () => {
        expect(findNeighborStations(groups, 'kibogaoka')).toEqual({
            prev: [{ id: 'futamatagawa', label: '二俣川' }],
            next: [],
        });
    });

    it('同じ駅を持つ 2 路線で、同じ隣を二重に出さない', () => {
        expect(findNeighborStations(groups, 'hiyoshi')).toEqual({
            prev: [],
            next: [{ id: 'tamagawa', label: '多摩川' }],
        });
    });

    it('右（next）は上り側・左（prev）は下り側。上りの向きは路線ごと（西谷: 右に上星川・羽沢横浜国大、左に鶴ヶ峰）', () => {
        const nishiya: StationGroup[] = [
            {
                routeId: 'main',
                label: '相鉄 本線',
                routeName: '本線',
                stations: [
                    st('yokohama', '横浜'),
                    st('kamihoshikawa', '上星川'),
                    st('nishiya', '西谷'),
                    st('tsurugamine', '鶴ヶ峰'),
                ],
            },
            {
                routeId: 'shinyokohama',
                label: '相鉄 新横浜線',
                routeName: '新横浜線',
                stations: [st('nishiya', '西谷'), st('hazawa', '羽沢横浜国大')],
            },
        ];
        // 本線は上りが起点（横浜）へ、新横浜線は上りが終点（新横浜）へ
        const inbound = (group: StationGroup) =>
            group.routeId === 'main' ? 'towardStart' : 'towardEnd';

        expect(findNeighborStations(nishiya, 'nishiya', inbound)).toEqual({
            prev: [{ id: 'tsurugamine', label: '鶴ヶ峰' }],
            next: [
                { id: 'kamihoshikawa', label: '上星川' },
                { id: 'hazawa', label: '羽沢横浜国大' },
            ],
        });
    });

    it('上りの向きが分からない路線は、駅の並びのまま（前を左・後を右）', () => {
        expect(
            findNeighborStations(groups, 'futamatagawa', () => null),
        ).toEqual(findNeighborStations(groups, 'futamatagawa'));
    });

    it('同じ名前の駅が並ぶときだけ、路線名を付けて区別する（小竹向原の千川）', () => {
        const kotake: StationGroup[] = [
            {
                routeId: 'fukutoshin',
                label: '東京メトロ 副都心線',
                routeName: '副都心線',
                stations: [
                    st('senkawa-f', '千川'),
                    st('kotake', '小竹向原'),
                    st('hikawadai', '氷川台'),
                ],
            },
            {
                routeId: 'yurakucho',
                label: '東京メトロ 有楽町線',
                routeName: '有楽町線',
                stations: [
                    st('senkawa-y', '千川'),
                    st('kotake', '小竹向原'),
                    st('hikawadai', '氷川台'),
                ],
            },
        ];

        expect(findNeighborStations(kotake, 'kotake')).toEqual({
            prev: [
                { id: 'senkawa-f', label: '千川（副都心線）' },
                { id: 'senkawa-y', label: '千川（有楽町線）' },
            ],
            next: [{ id: 'hikawadai', label: '氷川台' }],
        });
    });

    it('駅が無い・見つからないときは両方空', () => {
        expect(findNeighborStations(groups, null)).toEqual({
            prev: [],
            next: [],
        });
        expect(findNeighborStations(groups, 'nowhere')).toEqual({
            prev: [],
            next: [],
        });
    });
});
