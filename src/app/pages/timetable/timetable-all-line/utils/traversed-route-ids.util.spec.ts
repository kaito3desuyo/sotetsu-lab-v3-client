import { traversedRouteIds } from './traversed-route-ids.util';

const station = (stationId: string, routeIds: string[]) =>
    ({
        stationId,
        routeStationLists: routeIds.map((routeId) => ({ route: { routeId } })),
    }) as any;

const block = (...stationIdsPerTrip: string[][]) =>
    ({
        tripBlockId: 'b',
        trips: stationIdsPerTrip.map((ids, i) => ({
            tripId: `t${i}`,
            times: ids.map((stationId) => ({ stationId })),
        })),
    }) as any;

describe('traversedRouteIds', () => {
    // 相鉄本線 A-B-C、東急 C-D-E（C が共有駅）、埼京線 X-Y、
    // 東横線 P-Q-R-S と目黒線 P-Q-T（P-Q を共有）
    const stations = [
        station('A', ['sotetsu']),
        station('B', ['sotetsu']),
        station('C', ['sotetsu', 'tokyu']),
        station('D', ['tokyu']),
        station('E', ['tokyu']),
        station('X', ['saikyo']),
        station('Y', ['saikyo']),
        station('P', ['toyoko', 'meguro']),
        station('Q', ['toyoko', 'meguro']),
        station('R', ['toyoko']),
        station('S', ['toyoko']),
        station('T', ['meguro']),
    ];

    it('他社線で完結する運行は、その路線だけを返す', () => {
        expect(traversedRouteIds(stations, [block(['X', 'Y'])])).toEqual([
            'saikyo',
        ]);
    });

    it('直通する運行は、列車をまたいで走る路線をすべて返す', () => {
        expect(
            traversedRouteIds(stations, [block(['A', 'B', 'C'], ['C', 'D'])]),
        ).toEqual(['sotetsu', 'tokyu']);
    });

    it('共有駅を 1 つ踏むだけの路線は入れない', () => {
        expect(traversedRouteIds(stations, [block(['A', 'B', 'C'])])).toEqual([
            'sotetsu',
        ]);
    });

    it('時刻のある駅がすべて別の路線に含まれる路線は入れない', () => {
        expect(
            traversedRouteIds(stations, [block(['P', 'Q', 'R', 'S'])]),
        ).toEqual(['toyoko']);
    });

    it('共有区間だけを走るなら、両方の路線を返す', () => {
        expect(traversedRouteIds(stations, [block(['P', 'Q'])])).toEqual([
            'toyoko',
            'meguro',
        ]);
    });

    it('決まらなければ空配列', () => {
        expect(traversedRouteIds(stations, [])).toEqual([]);
    });
});
