import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { buildRouteIdsByStation } from './build-route-ids-by-station.util';

function route(
    routeId: string,
    stationIds: readonly string[],
): RouteDetailsDto {
    return {
        routeId,
        routeStationLists: stationIds.map((stationId) => ({
            routeStationListId: `${routeId}-${stationId}`,
            routeId,
            stationId,
            station: { stationId } as any,
        })),
    } as RouteDetailsDto;
}

describe('buildRouteIdsByStation', () => {
    it('選択路線に限定して駅→routeId集合を構築する', () => {
        const routes = [
            route('main', ['yokohama', 'futamatagawa', 'ebina']),
            route('izumino', ['futamatagawa', 'minamimakigahara', 'shonandai']),
        ];

        const result = buildRouteIdsByStation(routes, ['main', 'izumino']);

        expect(result.get('futamatagawa')).toEqual(new Set(['main', 'izumino']));
        expect(result.get('yokohama')).toEqual(new Set(['main']));
        expect(result.get('shonandai')).toEqual(new Set(['izumino']));
    });

    it('未選択の路線は無視する', () => {
        const routes = [
            route('main', ['yokohama', 'futamatagawa']),
            route('izumino', ['futamatagawa', 'shonandai']),
        ];

        const result = buildRouteIdsByStation(routes, ['main']);

        expect(result.get('futamatagawa')).toEqual(new Set(['main']));
        expect(result.has('shonandai')).toBe(false);
    });
});
