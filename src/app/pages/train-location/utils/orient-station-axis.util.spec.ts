import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';
import { orientStationAxis } from './orient-station-axis.util';

function station(stationId: string): RouteStationDto {
    return { stationId, stationName: stationId } as RouteStationDto;
}

// 路線の起点→終点の順（例 新横浜線: 西谷 → 羽沢横浜国大 → 新横浜）
const AXIS = [station('A'), station('B'), station('C')];

describe('orientStationAxis', () => {
    it('系統の始点（上り側）が並びの先頭にある路線はそのまま（本線: 横浜 → 海老名）', () => {
        const result = orientStationAxis(AXIS, {
            startStationId: 'A',
            endStationId: 'C',
        });

        expect(result.map((s) => s.stationId)).toEqual(['A', 'B', 'C']);
    });

    it('系統の始点が並びの末尾にある路線は裏返す（新横浜線: 新横浜 → 西谷）', () => {
        const result = orientStationAxis(AXIS, {
            startStationId: 'C',
            endStationId: 'A',
        });

        expect(result.map((s) => s.stationId)).toEqual(['C', 'B', 'A']);
    });

    it('系統に無い路線はそのまま', () => {
        expect(
            orientStationAxis(AXIS, undefined).map((s) => s.stationId),
        ).toEqual(['A', 'B', 'C']);
    });
});
