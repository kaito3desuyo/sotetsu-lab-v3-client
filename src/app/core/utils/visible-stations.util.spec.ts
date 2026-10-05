import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { visibleStations } from './visible-stations.util';

function makeStation(stationName: string, routeIds: string[]): any {
    return {
        stationId: stationName,
        stationName,
        routeStationLists: routeIds.map((routeId) => ({
            routeStationListId: `${stationName}-${routeId}`,
            route: { routeId, routeName: routeId },
        })),
    };
}

describe('visibleStations', () => {
    const honsenOnly = makeStation('かしわ台', ['本線']);
    const izuminoOnly = makeStation('いずみ野', ['いずみ野線']);
    const branch = makeStation('二俣川', ['本線', 'いずみ野線']);
    const atsugiOnly = makeStation('厚木', ['厚木線']);
    const all: StationDetailsDto[] = [
        honsenOnly,
        branch,
        izuminoOnly,
        atsugiOnly,
    ];

    it('全路線選択時は全駅を返す（現行表示と一致・リグレッションなし）', () => {
        expect(visibleStations(all, ['本線', 'いずみ野線', '厚木線'])).toEqual(
            all,
        );
    });

    it('1路線選択時はその路線に属する駅のみ返す', () => {
        expect(visibleStations(all, ['本線'])).toEqual([honsenOnly, branch]);
    });

    it('分岐駅は選択路線のいずれかに属していれば表示される', () => {
        expect(visibleStations(all, ['いずみ野線'])).toEqual([
            branch,
            izuminoOnly,
        ]);
    });

    it('未選択（空集合）では全駅を返す（絞り込みは「空＝全部」）', () => {
        expect(visibleStations(all, [])).toEqual(all);
    });

    it('2路線選択時はその2路線に属する駅のみ返す', () => {
        expect(visibleStations(all, ['本線', '厚木線'])).toEqual([
            honsenOnly,
            branch,
            atsugiOnly,
        ]);
    });
});
