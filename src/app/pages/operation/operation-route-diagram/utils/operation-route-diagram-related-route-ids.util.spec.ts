import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { relatedRouteIds } from './operation-route-diagram-related-route-ids.util';

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

describe('relatedRouteIds', () => {
    const honsenOnly1 = makeStation('かしわ台', ['本線']);
    const honsenOnly2 = makeStation('大和', ['本線']);
    // 西谷は本線・新横浜線の境界駅（かしわ台・大和とは別に、本線に同時所属）。
    // 経由駅ではないが、経由路線（本線）と同一駅で接続するため関連路線扱いになる。
    const boundary = makeStation('西谷', ['本線', '新横浜線']);
    const izuminoOnly = makeStation('いずみ野', ['いずみ野線']);
    const atsugiOnly = makeStation('厚木', ['厚木線']);
    const stations: StationDetailsDto[] = [
        honsenOnly1,
        honsenOnly2,
        boundary,
        izuminoOnly,
        atsugiOnly,
    ];

    it('経由路線に加え、経由路線の駅が同時所属する隣接路線までを関連路線とする（無関係な遠方路線は含まない）', () => {
        const trips: TripOperationListDetailsDto[] = [
            makeTrip('かしわ台', '大和'),
        ];

        // 本線のみを経由。西谷は本線にも所属するため新横浜線が関連路線として加わる。
        // いずみ野線・厚木線はどの経由駅とも接続しないため関連路線に含まれない。
        expect(relatedRouteIds(stations, trips).sort()).toEqual(
            ['新横浜線', '本線'].sort(),
        );
    });

    it('分岐駅を経由した場合はその駅の全所属路線が経由路線となり、それぞれの隣接路線まで関連路線に含まれる', () => {
        const branch = makeStation('二俣川', ['本線', 'いずみ野線']);
        const branchStations = [...stations, branch];
        const trips: TripOperationListDetailsDto[] = [
            makeTrip('かしわ台', '二俣川'),
            makeTrip('二俣川', 'いずみ野'),
        ];

        expect(relatedRouteIds(branchStations, trips).sort()).toEqual(
            ['いずみ野線', '新横浜線', '本線'].sort(),
        );
    });

    it('区間が空なら関連路線も空になる', () => {
        expect(relatedRouteIds(stations, [])).toEqual([]);
    });
});
