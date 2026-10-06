import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';

/** 表示中の先頭の駅より前にある、隠した駅をまとめる列（図の左端の「図外」） */
export const ROUTE_DIAGRAM_OUTSIDE_LEFT_ID = '__route-diagram-outside-left__';
/** 表示中の末尾の駅より後にある、隠した駅をまとめる列（図の右端の「図外」） */
export const ROUTE_DIAGRAM_OUTSIDE_RIGHT_ID = '__route-diagram-outside-right__';
export const ROUTE_DIAGRAM_OUTSIDE_STATION_NAME = '図外';
const ROUTE_DIAGRAM_OUTSIDE_BETWEEN_PREFIX = '__route-diagram-outside-after:';

/**
 * 表示中の駅の間でひと続きに隠れた駅をまとめる列（その位置の「図外」）。
 * まとまりの直前の表示駅で見分ける。
 */
export function routeDiagramOutsideBetweenId(
    previousVisibleStationId: string,
): string {
    return `${ROUTE_DIAGRAM_OUTSIDE_BETWEEN_PREFIX}${previousVisibleStationId}__`;
}

export function isRouteDiagramOutsideStationId(
    stationId: string | undefined,
): boolean {
    return (
        stationId === ROUTE_DIAGRAM_OUTSIDE_LEFT_ID ||
        stationId === ROUTE_DIAGRAM_OUTSIDE_RIGHT_ID ||
        !!stationId?.startsWith(ROUTE_DIAGRAM_OUTSIDE_BETWEEN_PREFIX)
    );
}

/**
 * 付け替えた後の行路。端の駅を付け替えたときは、本当の駅名を持たせる
 * （図には時刻の前に駅名を書き、○・△ は付けない）。
 */
export type OperationRouteDiagramTripOperationList =
    TripOperationListDetailsDto & {
        startHiddenStationName?: string;
        endHiddenStationName?: string;
    };

/**
 * B5: 路線チップ OFF で縦軸（表示駅リスト）から消えた駅を始発/終着に持つ行路（線分）を、
 * 表示中の列へ付け替える。
 *
 * SVG 描画（drawing-presentational）は駅の並び順における index を直接座標計算に使うため、
 * 始発/終着駅が `visibleStations` に無いと座標が求まらない。付け替え先は `allStations`
 * （絞り込み前の全駅順）で決める。
 * - 表示中の先頭の駅より前の駅 → 左端の「図外」の列
 * - 表示中の末尾の駅より後の駅 → 右端の「図外」の列
 * - 表示中の駅の間の駅 → 先頭と末尾の近い方の「図外」の列（2026-10-07。以前は最も近い表示中の駅）
 *
 * 見える駅で始まる・終わるように見えないよう、付け替えた端には本当の駅名を持たせる
 * （2026-10-06。南古谷で出庫する列車が大崎で出庫するように見えると指摘された）。
 * 時刻・列車番号・種別等の他フィールドは一切変更しない。
 */
export function reconnectTripOperationLists(
    tripOperationLists: readonly TripOperationListDetailsDto[],
    allStations: readonly StationDetailsDto[],
    visibleStations: readonly StationDetailsDto[],
): OperationRouteDiagramTripOperationList[] {
    const visibleIds = new Set(visibleStations.map((s) => s.stationId));
    const allIndexById = new Map(
        allStations.map((s, index) => [s.stationId, index]),
    );
    const visibleAllIndexes = allStations
        .map((s, index) => (visibleIds.has(s.stationId) ? index : -1))
        .filter((index) => index >= 0);
    const firstVisibleIndex = visibleAllIndexes[0];
    const lastVisibleIndex = visibleAllIndexes[visibleAllIndexes.length - 1];

    function reconnect(stationId: string | undefined): {
        stationId: string | undefined;
        hiddenStationName?: string;
    } {
        if (!stationId || visibleIds.has(stationId)) return { stationId };

        const index = allIndexById.get(stationId);
        if (index === undefined || firstVisibleIndex === undefined) {
            return { stationId };
        }
        const hiddenStationName = allStations[index].stationName;

        if (index < firstVisibleIndex) {
            return {
                stationId: ROUTE_DIAGRAM_OUTSIDE_LEFT_ID,
                hiddenStationName,
            };
        }
        if (index > lastVisibleIndex) {
            return {
                stationId: ROUTE_DIAGRAM_OUTSIDE_RIGHT_ID,
                hiddenStationName,
            };
        }

        // 間の駅も近い表示駅へは付けない。表示駅が別の路線の駅だと、そこで折り返したように
        // 見えるため（2026-10-07 ユーザー指示）。ひと続きに隠れた駅のまとまりごとに、
        // その位置（直前の表示駅の後）に置く図外の列へ寄せる。同じまとまりの駅で着いて
        // 出る列車は同じ図外の列で折り返す。
        let blockStart = index;
        while (!visibleIds.has(allStations[blockStart - 1].stationId)) {
            blockStart--;
        }

        return {
            stationId: routeDiagramOutsideBetweenId(
                allStations[blockStart - 1].stationId,
            ),
            hiddenStationName,
        };
    }

    return tripOperationLists.map((tripOperationList) => {
        const start = reconnect(tripOperationList.startTime?.stationId);
        const end = reconnect(tripOperationList.endTime?.stationId);

        return {
            ...tripOperationList,
            startTime: tripOperationList.startTime
                ? { ...tripOperationList.startTime, stationId: start.stationId }
                : tripOperationList.startTime,
            endTime: tripOperationList.endTime
                ? { ...tripOperationList.endTime, stationId: end.stationId }
                : tripOperationList.endTime,
            startHiddenStationName: start.hiddenStationName,
            endHiddenStationName: end.hiddenStationName,
        };
    });
}

/**
 * 付け替えた行路が「図外」の列を使うときだけ、表示駅リストにその列を足す。
 * 左右の図外は端に、間の図外は直前の表示駅の後に置く。
 */
export function withOutsideStationColumns(
    visibleStations: readonly StationDetailsDto[],
    tripOperationLists: readonly OperationRouteDiagramTripOperationList[],
): StationDetailsDto[] {
    const usedIds = new Set(
        tripOperationLists.flatMap((t) => [
            t.startTime?.stationId,
            t.endTime?.stationId,
        ]),
    );
    const outsideStation = (stationId: string) =>
        ({
            stationId,
            stationName: ROUTE_DIAGRAM_OUTSIDE_STATION_NAME,
        }) as StationDetailsDto;

    return [
        ...(usedIds.has(ROUTE_DIAGRAM_OUTSIDE_LEFT_ID)
            ? [outsideStation(ROUTE_DIAGRAM_OUTSIDE_LEFT_ID)]
            : []),
        ...visibleStations.flatMap((station) => {
            const betweenId = routeDiagramOutsideBetweenId(station.stationId);
            return usedIds.has(betweenId)
                ? [station, outsideStation(betweenId)]
                : [station];
        }),
        ...(usedIds.has(ROUTE_DIAGRAM_OUTSIDE_RIGHT_ID)
            ? [outsideStation(ROUTE_DIAGRAM_OUTSIDE_RIGHT_ID)]
            : []),
    ];
}
