import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { RouteStationListDetailsDto } from 'src/app/libs/route/usecase/dtos/route-station-list-details.dto';
import { buildInterchangeRoutesByStationId } from './build-interchange-routes-by-station-id.util';

function rsl(stationId: string): RouteStationListDetailsDto {
    return { station: { stationId } } as RouteStationListDetailsDto;
}

function route(
    routeId: string,
    routeName: string,
    stationIds: string[],
): RouteDetailsDto {
    return {
        routeId,
        routeName,
        routeStationLists: stationIds.map((id) => rsl(id)),
    } as RouteDetailsDto;
}

describe('buildInterchangeRoutesByStationId', () => {
    it('二俣川（本線・いずみ野線の両方に属す）は、いずみ野線選択時に本線が乗換路線として出る', () => {
        const routes = [
            route('r-main', '本線', ['futamatagawa', 'yokohama']),
            route('r-izumino', 'いずみ野線', ['futamatagawa', 'izumino']),
        ];

        const result = buildInterchangeRoutesByStationId(routes, 'r-izumino');

        expect(result.get('futamatagawa')).toEqual([
            { routeId: 'r-main', routeName: '本線' },
        ]);
    });

    it('選択中の routeId は乗換路線から除外する', () => {
        const routes = [
            route('r-main', '本線', ['futamatagawa']),
            route('r-izumino', 'いずみ野線', ['futamatagawa']),
        ];

        const result = buildInterchangeRoutesByStationId(routes, 'r-main');

        expect(result.get('futamatagawa')).toEqual([
            { routeId: 'r-izumino', routeName: 'いずみ野線' },
        ]);
    });

    it('他ルートに属さない駅は乗換路線を持たない（未登録 = undefined）', () => {
        const routes = [
            route('r-main', '本線', ['ebina']),
            route('r-izumino', 'いずみ野線', ['izumino']),
        ];

        const result = buildInterchangeRoutesByStationId(routes, 'r-main');

        expect(result.get('ebina')).toBeUndefined();
    });

    it('同一駅・同一路線が複数回登場しても重複させない', () => {
        const routes = [
            route('r-main', '本線', ['futamatagawa']),
            {
                routeId: 'r-izumino',
                routeName: 'いずみ野線',
                routeStationLists: [rsl('futamatagawa'), rsl('futamatagawa')],
            } as RouteDetailsDto,
        ];

        const result = buildInterchangeRoutesByStationId(routes, 'r-main');

        expect(result.get('futamatagawa')).toEqual([
            { routeId: 'r-izumino', routeName: 'いずみ野線' },
        ]);
    });

    it('routeId/routeName が欠落したルートは無視する', () => {
        const routes = [
            { routeStationLists: [rsl('futamatagawa')] } as RouteDetailsDto,
        ];

        const result = buildInterchangeRoutesByStationId(routes, 'r-main');

        expect(result.size).toBe(0);
    });

    it('selectedRouteId が null の場合も全ルートを乗換候補として扱う', () => {
        const routes = [route('r-main', '本線', ['futamatagawa'])];

        const result = buildInterchangeRoutesByStationId(routes, null);

        expect(result.get('futamatagawa')).toEqual([
            { routeId: 'r-main', routeName: '本線' },
        ]);
    });
});
