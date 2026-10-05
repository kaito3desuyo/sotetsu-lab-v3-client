import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ITimetableEditFormTimeValue } from '../interfaces/timetable-edit-form.interface';
import { ETimetableEditFormStopType } from '../special/enums/timetable-edit-form.enum';
import {
    buildRouteReachability,
    findRouteErrors,
    routeIdsTraversedBy,
} from './timetable-edit-form-route.util';

const { STOP, PASS, NOT_GOING_THROUGH } = ETimetableEditFormStopType;

/** [駅名, [路線, 路線内の順番][]] */
function station(name: string, lists: [string, number][]): StationDetailsDto {
    return {
        stationId: name,
        stationName: name,
        routeStationLists: lists.map(([routeId, stationSequence]) => ({
            routeStationListId: `${routeId}-${name}`,
            routeId,
            stationSequence,
        })),
    } as StationDetailsDto;
}

/**
 * 下りの並び（本線 横浜→海老名 の途中で いずみ野線・厚木線 を挟む。格子と同じ形）
 * 本線: 横浜1 西谷2 二俣川3 希望ヶ丘4 かしわ台5 海老名6
 * いずみ野線: 二俣川1 南万騎が原2 湘南台3
 * 厚木線: かしわ台1 厚木2
 * 新横浜線: 西谷1 新横浜2（下りの並びでは 新横浜 が先）
 */
const outbound = [
    station('新横浜', [['shinyoko', 2]]),
    station('横浜', [['main', 1]]),
    station('西谷', [
        ['main', 2],
        ['shinyoko', 1],
    ]),
    station('二俣川', [
        ['main', 3],
        ['izumino', 1],
    ]),
    station('南万騎が原', [['izumino', 2]]),
    station('湘南台', [['izumino', 3]]),
    station('希望ヶ丘', [['main', 4]]),
    station('かしわ台', [
        ['main', 5],
        ['atsugi', 1],
    ]),
    station('海老名', [['main', 6]]),
    station('厚木', [['atsugi', 2]]),
];
const inbound = [...outbound].reverse();

function times(
    stations: StationDetailsDto[],
    stops: Record<string, ETimetableEditFormStopType>,
): ITimetableEditFormTimeValue[] {
    return stations.map((s) => ({
        stopType: stops[s.stationName] ?? NOT_GOING_THROUGH,
        arrivalTime: null,
        departureTime: null,
    }));
}

function names(stations: StationDetailsDto[], indexes: number[]): string[] {
    return indexes.map((i) => stations[i].stationName);
}

describe('buildRouteReachability / findRouteErrors', () => {
    it('途中の駅が抜けていても、同じ向きにたどれれば誤りにしない（横浜→湘南台）', () => {
        const canReach = buildRouteReachability(outbound);
        expect(
            findRouteErrors(
                times(outbound, { 横浜: STOP, 湘南台: STOP }),
                canReach,
            ),
        ).toEqual([]);
    });

    it('上りで海老名の次に湘南台は行けない', () => {
        const canReach = buildRouteReachability(inbound);
        const errors = findRouteErrors(
            times(inbound, { 海老名: STOP, 湘南台: STOP, 横浜: STOP }),
            canReach,
        );
        expect(errors).toHaveLength(1);
        expect(names(inbound, [errors[0].prevIndex, errors[0].index])).toEqual([
            '海老名',
            '湘南台',
        ]);
    });

    it('厚木と海老名はどちらの向きでも行き来できない', () => {
        for (const stations of [outbound, inbound]) {
            const canReach = buildRouteReachability(stations);
            expect(
                findRouteErrors(
                    times(stations, { 厚木: STOP, 海老名: STOP }),
                    canReach,
                ),
            ).toHaveLength(1);
        }
    });

    it('上りで厚木から二俣川・新横浜へは行ける（向きの違う新横浜線もたどる）', () => {
        const canReach = buildRouteReachability(inbound);
        expect(
            findRouteErrors(
                times(inbound, { 厚木: STOP, 二俣川: PASS, 新横浜: STOP }),
                canReach,
            ),
        ).toEqual([]);
    });

    it('上りで西谷から横浜と新横浜の両方は通れない', () => {
        const canReach = buildRouteReachability(inbound);
        expect(
            findRouteErrors(
                times(inbound, { 海老名: STOP, 横浜: STOP, 新横浜: STOP }),
                canReach,
            ),
        ).toHaveLength(1);
    });

    it('‖ の駅は見ない', () => {
        const canReach = buildRouteReachability(outbound);
        expect(
            findRouteErrors(
                times(outbound, {
                    横浜: STOP,
                    湘南台: NOT_GOING_THROUGH,
                    海老名: STOP,
                }),
                canReach,
            ),
        ).toEqual([]);
    });

    it('路線の分からない駅は判定しない', () => {
        const stations = [...outbound, station('不明', [])];
        const canReach = buildRouteReachability(stations);
        expect(
            findRouteErrors(
                times(stations, { 海老名: STOP, 不明: STOP }),
                canReach,
            ),
        ).toEqual([]);
    });
});

describe('routeIdsTraversedBy', () => {
    it('通る駅を覆う路線を返す。分岐駅 1 駅だけの路線は含めない', () => {
        // 横浜→二俣川→湘南台: 本線（横浜・二俣川）といずみ野線（二俣川・湘南台）
        expect(
            routeIdsTraversedBy([['横浜', '二俣川', '湘南台']], outbound),
        ).toEqual(new Set(['main', 'izumino']));
        // 横浜→二俣川: 二俣川はいずみ野線にもあるが 1 駅だけ
        expect(routeIdsTraversedBy([['横浜', '二俣川']], outbound)).toEqual(
            new Set(['main']),
        );
    });

    it('複々線のように駅を共有する路線は、少ない路線で全部の駅を覆えば足りる（東横線だけ。目黒線は足さない）', () => {
        const stations = [
            station('新横浜', [['tokyu-shinyoko', 1]]),
            station('日吉', [
                ['tokyu-shinyoko', 2],
                ['toyoko', 10],
                ['meguro', 10],
            ]),
            station('武蔵小杉', [
                ['toyoko', 8],
                ['meguro', 8],
            ]),
            station('田園調布', [
                ['toyoko', 6],
                ['meguro', 6],
            ]),
            station('自由が丘', [['toyoko', 5]]),
            station('目黒', [['meguro', 1]]),
        ];
        expect(
            routeIdsTraversedBy(
                [['新横浜', '日吉', '武蔵小杉', '田園調布', '自由が丘']],
                stations,
            ),
        ).toEqual(new Set(['tokyu-shinyoko', 'toyoko']));
    });

    it('路線の分からない駅は無視する', () => {
        expect(routeIdsTraversedBy([['横浜', '不明駅']], outbound)).toEqual(
            new Set(['main']),
        );
    });
});
