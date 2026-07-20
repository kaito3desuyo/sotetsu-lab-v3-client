import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { RouteStationListDetailsDto } from 'src/app/libs/route/usecase/dtos/route-station-list-details.dto';
import { selectMajorStationIds } from './select-major-station-ids.util';

function rsl(
    stationId: string,
    stationSequence: number,
): RouteStationListDetailsDto {
    return { stationId, stationSequence } as RouteStationListDetailsDto;
}

function route(
    routeId: string,
    stops: RouteStationListDetailsDto[],
): RouteDetailsDto {
    return { routeId, routeStationLists: stops } as RouteDetailsDto;
}

describe('selectMajorStationIds', () => {
    it('各路線の起終点（stationSequence の最小・最大）を主要駅にする', () => {
        const routes = [
            route('r1', [rsl('A', 1), rsl('B', 2), rsl('C', 3)]),
        ];

        const major = selectMajorStationIds(routes);

        expect(major.has('A')).toBe(true); // 起点
        expect(major.has('C')).toBe(true); // 終点
        expect(major.has('B')).toBe(false); // 中間駅は除外
    });

    it('複数 routeId に属する駅（乗換・分岐駅）を主要駅にする', () => {
        const routes = [
            route('r1', [rsl('A', 1), rsl('J', 2), rsl('B', 3)]),
            route('r2', [rsl('C', 1), rsl('J', 2), rsl('D', 3)]),
        ];

        const major = selectMajorStationIds(routes);

        // J は r1/r2 双方に属する乗換駅 → 中間位置でも主要駅
        expect(major.has('J')).toBe(true);
    });

    it('stationSequence が昇順でなくても最小・最大で起終点を判定する', () => {
        const routes = [
            route('r1', [rsl('B', 2), rsl('C', 3), rsl('A', 1)]),
        ];

        const major = selectMajorStationIds(routes);

        expect(major.has('A')).toBe(true);
        expect(major.has('C')).toBe(true);
        expect(major.has('B')).toBe(false);
    });

    it('全駅の一部だけが主要駅に選ばれる（間引きが効く）', () => {
        const routes = [
            route('r1', [
                rsl('A', 1),
                rsl('B', 2),
                rsl('C', 3),
                rsl('D', 4),
                rsl('E', 5),
            ]),
        ];

        const major = selectMajorStationIds(routes);

        // 5 駅中、起終点の 2 駅のみ
        expect(major.size).toBe(2);
        expect([...major].sort()).toEqual(['A', 'E']);
    });

    it('stationId 欠落の routeStationList は無視する', () => {
        const routes = [
            route('r1', [
                { stationSequence: 1 } as RouteStationListDetailsDto,
                rsl('A', 2),
                rsl('B', 3),
            ]),
        ];

        const major = selectMajorStationIds(routes);

        expect(major.has('A')).toBe(true);
        expect(major.has('B')).toBe(true);
    });

    it('空の路線配列に対しては空集合を返す', () => {
        expect(selectMajorStationIds([]).size).toBe(0);
    });
});
