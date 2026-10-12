import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { buildStationNameById } from './station-name-by-id.util';

const route = (stations: { stationId?: string; stationName?: string }[]) =>
    ({
        routeStationLists: stations.map((station) => ({ station })),
    }) as RouteDetailsDto;

describe('buildStationNameById', () => {
    it('全路線の駅から 駅 id → 駅名 を引けるようにする', () => {
        const map = buildStationNameById([
            route([
                { stationId: 'yokohama', stationName: '横浜' },
                { stationId: 'nishiya', stationName: '西谷' },
            ]),
            route([{ stationId: 'shibuya', stationName: '渋谷' }]),
        ]);

        expect([...map]).toEqual([
            ['yokohama', '横浜'],
            ['nishiya', '西谷'],
            ['shibuya', '渋谷'],
        ]);
    });

    it('id か駅名の無い駅と、駅一覧の無い路線は飛ばす', () => {
        const map = buildStationNameById([
            route([
                { stationId: 'a' },
                { stationName: '名前だけ' },
                { stationId: 'b', stationName: 'B' },
            ]),
            {} as RouteDetailsDto,
        ]);

        expect([...map]).toEqual([['b', 'B']]);
    });
});
