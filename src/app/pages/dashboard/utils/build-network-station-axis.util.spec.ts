import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { RouteStationListDetailsDto } from 'src/app/libs/route/usecase/dtos/route-station-list-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { buildNetworkStationAxis } from './build-network-station-axis.util';

function station(stationId: string): StationDetailsDto {
    return { stationId } as StationDetailsDto;
}

function routeStationList(
    overrides: Partial<RouteStationListDetailsDto>,
): RouteStationListDetailsDto {
    return overrides as RouteStationListDetailsDto;
}

function route(routeStationLists: RouteStationListDetailsDto[]): RouteDetailsDto {
    return { routeId: 'r', routeStationLists } as RouteDetailsDto;
}

describe('buildNetworkStationAxis', () => {
    it('全路線の routeStationLists を統合し stationId を持つ駅軸へ変換する', () => {
        const routes = [
            route([
                routeStationList({
                    station: station('A'),
                    stationSequence: 1,
                    stationNumbering: 'SO01',
                }),
                routeStationList({
                    station: station('B'),
                    stationSequence: 2,
                    stationNumbering: 'SO02',
                }),
            ]),
            route([
                routeStationList({
                    station: station('C'),
                    stationSequence: 1,
                    stationNumbering: 'IZ01',
                }),
            ]),
        ];

        const axis = buildNetworkStationAxis(routes);

        expect(axis.map((s) => s.stationId)).toEqual(['A', 'B', 'C']);
        expect(axis[0].stationSequence).toBe(1);
        expect(axis[0].stationNumbering).toBe('SO01');
    });

    it('station が欠落した routeStationList は除外する', () => {
        const routes = [
            route([
                routeStationList({ station: undefined, stationSequence: 1 }),
                routeStationList({ station: station('A'), stationSequence: 2 }),
            ]),
        ];

        const axis = buildNetworkStationAxis(routes);

        expect(axis.map((s) => s.stationId)).toEqual(['A']);
    });

    it('複数路線に属する乗換駅は重複したまま含まれる（呼び出し側の Set 化で吸収する想定）', () => {
        const routes = [
            route([
                routeStationList({ station: station('X'), stationSequence: 1 }),
            ]),
            route([
                routeStationList({ station: station('X'), stationSequence: 1 }),
            ]),
        ];

        const axis = buildNetworkStationAxis(routes);

        expect(axis.map((s) => s.stationId)).toEqual(['X', 'X']);
    });

    it('空の路線配列に対しては空配列を返す', () => {
        expect(buildNetworkStationAxis([])).toEqual([]);
    });
});
