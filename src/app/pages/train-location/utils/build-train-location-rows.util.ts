import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';
import { TrainPosition } from 'src/app/shared/train-position.util';
import { TrainLocationCard } from '../interfaces/train-location-card.interface';
import {
    TrainLocationBetweenRow,
    TrainLocationInterchangeRoute,
    TrainLocationRow,
    TrainLocationStationRow,
} from '../interfaces/train-location-row.interface';

/**
 * 駅軸・在線一覧（`estimatePositions` の結果）・カード辞書から、描画用の行リストを構築する純関数。
 * 駅行 + 駅間行が交互に並ぶ（先頭・末尾は必ず駅行）。
 *
 * - 停車中の位置は当該駅行の leftCards/rightCards に振り分ける
 * - 駅間走行中の位置は「駅軸インデックス空間での線形補間」で区間へ配置する。
 *   between の from/to は trip 自身の停車駅ペアであり、通過駅を挟む優等列車では
 *   **駅軸上で隣接しない**（例: 駅 index 2 → 6）。そのため
 *   軸位置 = fromIndex + (toIndex - fromIndex) * progress を計算し、
 *   floor(軸位置) を先頭駅とする区間行へ topProgress = 軸位置 - floor(軸位置) で配置する。
 *   この式は隣接ペア（各停）も、駅軸を降順に走る trip（topProgress の反転）も同じ形で包含する
 * - 左右の振り分けは card.direction（inbound=左＝上り、outbound=右＝下り）による
 * - 駅軸に存在しない stationId を参照する位置・cardsById に存在しない tripId は無視する（防御的）
 * - interchangeRoutesByStationId が渡された駅には乗換路線一覧を設定する（無ければ空配列）
 */
export function buildTrainLocationRows(
    orderedStations: readonly RouteStationDto[],
    positions: readonly TrainPosition[],
    cardsById: ReadonlyMap<string, TrainLocationCard>,
    majorStationIds: ReadonlySet<string>,
    interchangeRoutesByStationId?: ReadonlyMap<string, TrainLocationInterchangeRoute[]>,
): TrainLocationRow[] {
    const rows: TrainLocationRow[] = [];
    const stationRowByStationId = new Map<string, TrainLocationStationRow>();
    const stationIndexByStationId = new Map<string, number>();
    /** betweenRows[i] = 駅軸 index i → i+1 の区間行 */
    const betweenRows: TrainLocationBetweenRow[] = [];

    orderedStations.forEach((station, index) => {
        const stationRow: TrainLocationStationRow = {
            kind: 'station',
            stationId: station.stationId,
            stationName: station.stationName,
            isMajor: majorStationIds.has(station.stationId),
            leftCards: [],
            rightCards: [],
            interchangeRoutes:
                interchangeRoutesByStationId?.get(station.stationId) ?? [],
        };
        stationRowByStationId.set(station.stationId, stationRow);
        stationIndexByStationId.set(station.stationId, index);
        rows.push(stationRow);

        if (index < orderedStations.length - 1) {
            const next = orderedStations[index + 1];
            const betweenRow: TrainLocationBetweenRow = {
                kind: 'between',
                fromStationId: station.stationId,
                toStationId: next.stationId,
                leftCards: [],
                rightCards: [],
            };
            betweenRows.push(betweenRow);
            rows.push(betweenRow);
        }
    });

    for (const position of positions) {
        const card = cardsById.get(position.tripId);
        if (!card) {
            continue;
        }

        const targetArrays = (row: {
            leftCards: unknown[];
            rightCards: unknown[];
        }) => (card.direction === 'inbound' ? row.leftCards : row.rightCards);

        if (position.type === 'stopped') {
            const row = stationRowByStationId.get(position.stationId);
            if (!row) {
                continue;
            }
            (targetArrays(row) as TrainLocationCard[]).push(card);
            continue;
        }

        const fromIndex = stationIndexByStationId.get(position.fromStationId);
        const toIndex = stationIndexByStationId.get(position.toStationId);
        if (
            fromIndex === undefined ||
            toIndex === undefined ||
            fromIndex === toIndex ||
            betweenRows.length === 0
        ) {
            continue;
        }

        // 駅軸インデックス空間での現在位置（例: 2→6 の progress 0.5 は軸位置 4.0）。
        // 非隣接ペア（通過駅を含む優等列車）・降順走行（上り）もこの 1 式で扱う。
        const clampedProgress = Math.min(Math.max(position.progress, 0), 1);
        const axisPosition =
            fromIndex + (toIndex - fromIndex) * clampedProgress;
        const segmentIndex = Math.min(
            Math.max(Math.floor(axisPosition), 0),
            betweenRows.length - 1,
        );
        const topProgress = Math.min(
            Math.max(axisPosition - segmentIndex, 0),
            1,
        );

        (
            targetArrays(betweenRows[segmentIndex]) as {
                card: TrainLocationCard;
                topProgress: number;
            }[]
        ).push({ card, topProgress });
    }

    return rows;
}
