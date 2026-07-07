import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { visitedRouteIds } from './operation-route-diagram-visited-route-ids.util';

function makeStation(stationId: string, routeIds: string[]): any {
    return {
        stationId,
        stationName: stationId,
        routeStationLists: routeIds.map((routeId) => ({
            routeStationListId: `${stationId}-${routeId}`,
            route: { routeId, routeName: routeId },
        })),
    };
}

function makeTrip(startStationId: string, endStationId: string): any {
    return {
        startTime: { stationId: startStationId },
        endTime: { stationId: endStationId },
    };
}

describe('visitedRouteIds', () => {
    const honsenOnly1 = makeStation('かしわ台', ['本線']);
    const honsenOnly2 = makeStation('大和', ['本線']);
    const branch = makeStation('二俣川', ['本線', 'いずみ野線']);
    const izuminoOnly = makeStation('いずみ野', ['いずみ野線']);
    const atsugiOnly = makeStation('厚木', ['厚木線']);
    const stations: StationDetailsDto[] = [
        honsenOnly1,
        honsenOnly2,
        branch,
        izuminoOnly,
        atsugiOnly,
    ];

    it('停車した駅の所属路線のみを返す（未経由の厚木線・いずみ野線は含まれない）', () => {
        const trips: TripOperationListDetailsDto[] = [
            makeTrip('かしわ台', '大和'),
        ];

        expect(visitedRouteIds(stations, trips)).toEqual(['本線']);
    });

    it('複数区間を走査し重複を除いた路線集合を返す（分岐駅は所属する全路線を経由路線とみなす）', () => {
        const trips: TripOperationListDetailsDto[] = [
            makeTrip('かしわ台', '二俣川'),
            makeTrip('二俣川', 'いずみ野'),
        ];

        expect(visitedRouteIds(stations, trips)).toEqual([
            '本線',
            'いずみ野線',
        ]);
    });

    it('区間が空なら空配列を返す', () => {
        expect(visitedRouteIds(stations, [])).toEqual([]);
    });
});
