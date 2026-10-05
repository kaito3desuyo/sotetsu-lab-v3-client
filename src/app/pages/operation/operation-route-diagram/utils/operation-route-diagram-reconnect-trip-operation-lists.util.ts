import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';

/**
 * B5: 路線チップ OFF で縦軸（表示駅リスト）から消えた駅を始発/終着に持つ行路（線分）を、
 * 表示中の最寄り駅へ再接続する。
 *
 * SVG 描画（drawing-presentational）は駅の並び順における index を直接座標計算に使うため、
 * トリップの始発/終着駅が `visibleStations` に存在しない場合、座標が求まらず線分が
 * 描画されない（受け入れ条件「行路の線分は表示駅間で再接続する」に抵触）。
 * このユーティリティは、始発/終着駅が非表示のときのみ `allStations`（絞り込み前の
 * 全駅順）上で最も近い表示中の駅の stationId に付け替える。時刻・列車番号・種別等の
 * 他フィールドは一切変更しない。
 */
export function reconnectTripOperationLists(
    tripOperationLists: readonly TripOperationListDetailsDto[],
    allStations: readonly StationDetailsDto[],
    visibleStations: readonly StationDetailsDto[],
): TripOperationListDetailsDto[] {
    const visibleIds = new Set(visibleStations.map((s) => s.stationId));
    const allIndexById = new Map(
        allStations.map((s, index) => [s.stationId, index]),
    );

    function nearestVisibleStationId(
        stationId: string | undefined,
    ): string | undefined {
        if (!stationId || visibleIds.has(stationId)) return stationId;

        const index = allIndexById.get(stationId);
        if (index === undefined) return stationId;

        for (let offset = 1; offset < allStations.length; offset++) {
            const before = allStations[index - offset];
            if (before && visibleIds.has(before.stationId)) {
                return before.stationId;
            }
            const after = allStations[index + offset];
            if (after && visibleIds.has(after.stationId)) {
                return after.stationId;
            }
        }

        return stationId;
    }

    return tripOperationLists.map((tripOperationList) => ({
        ...tripOperationList,
        startTime: tripOperationList.startTime
            ? {
                  ...tripOperationList.startTime,
                  stationId: nearestVisibleStationId(
                      tripOperationList.startTime.stationId,
                  ),
              }
            : tripOperationList.startTime,
        endTime: tripOperationList.endTime
            ? {
                  ...tripOperationList.endTime,
                  stationId: nearestVisibleStationId(
                      tripOperationList.endTime.stationId,
                  ),
              }
            : tripOperationList.endTime,
    }));
}
