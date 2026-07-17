import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { baseTripClassName } from 'src/app/shared/trip-class-base-name.util';
import {
    classifyBandStyle,
    OperationRouteDiagramBandStyle,
} from './operation-route-diagram-classify-band-style.util';

export interface OperationRouteDiagramBandViewModel {
    tripOperationListId: string;
    tripBlockId?: string;
    tripDirection?: number;
    tripNumber: string;
    /** 系統サフィックスを除いた種別名（例: 「特急（SO→TY）」→「特急」） */
    tripClassName: string;
    /** 行先＝終着駅名（reconnect 後は境界駅名に置き換わっている） */
    destinationStationName: string;
    /** 帯の左端の駅 index（stations 配列内） */
    leftIndex: number;
    /** 帯の右端の駅 index */
    rightIndex: number;
    /** 左端に表示する時刻（`HH:mm:ss`生値。整形はテンプレート側の pipe に委ねる） */
    leftTime?: string;
    /** 右端に表示する時刻 */
    rightTime?: string;
    style: OperationRouteDiagramBandStyle;
    /** 種別色（データ駆動・UI ハードコード禁止） */
    color: string;
    depotOut: boolean;
    depotIn: boolean;
    /** 出庫ノードの駅 index（startTime 側） */
    depotOutIndex: number;
    /** 入庫ノードの駅 index（endTime 側） */
    depotInIndex: number;
}

const FALLBACK_COLOR = '#666666';

/**
 * G6（モック04）: 行路帯 1 本分の描画に必要な値を純関数として組み立てる。
 *
 * 帯の左右端は「駅 index の大小」から直接求める（tripDirection の分岐に頼らない）。
 * これにより INBOUND/OUTBOUND いずれでも、駅 index が小さい側に対応する時刻が
 * 常に左端・大きい側が常に右端に来る（DoD「帯の両端に発着時刻」）。
 * 到着はトリップの終着（endTime）で必ず起きるため、行先は常に endTime の駅名。
 *
 * `stations` は表示中の駅リスト（B5 の絞り込み・T6.3 の reconnect 適用後）を渡すこと。
 */
export function buildBandViewModels(
    tripOperationLists: readonly TripOperationListDetailsDto[],
    stations: readonly StationDetailsDto[],
): OperationRouteDiagramBandViewModel[] {
    const indexById = new Map(stations.map((s, i) => [s.stationId, i]));
    const nameById = new Map(stations.map((s) => [s.stationId, s.stationName]));

    return tripOperationLists.map((tripOperationList) => {
        const startId = tripOperationList.startTime?.stationId;
        const endId = tripOperationList.endTime?.stationId;
        const startIndex = startId ? (indexById.get(startId) ?? 0) : 0;
        const endIndex = endId ? (indexById.get(endId) ?? 0) : 0;

        const startIsLeft = startIndex <= endIndex;
        const leftIndex = startIsLeft ? startIndex : endIndex;
        const rightIndex = startIsLeft ? endIndex : startIndex;
        const leftTime = startIsLeft
            ? tripOperationList.startTime?.departureTime
            : tripOperationList.endTime?.arrivalTime;
        const rightTime = startIsLeft
            ? tripOperationList.endTime?.arrivalTime
            : tripOperationList.startTime?.departureTime;

        return {
            tripOperationListId: tripOperationList.tripOperationListId,
            tripBlockId: tripOperationList.trip?.tripBlockId,
            tripDirection: tripOperationList.trip?.tripDirection,
            tripNumber: tripOperationList.trip?.tripNumber ?? '',
            tripClassName: baseTripClassName(
                tripOperationList.trip?.tripClass?.tripClassName,
            ),
            destinationStationName: endId ? (nameById.get(endId) ?? '') : '',
            leftIndex,
            rightIndex,
            leftTime,
            rightTime,
            style: classifyBandStyle(
                tripOperationList.trip?.tripClass?.tripClassName,
            ),
            color:
                tripOperationList.trip?.tripClass?.tripClassColor ??
                FALLBACK_COLOR,
            depotOut: !!tripOperationList.trip?.depotOut,
            depotIn: !!tripOperationList.trip?.depotIn,
            depotOutIndex: startIndex,
            depotInIndex: endIndex,
        };
    });
}
