import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TimetableStationFindOtherTripsInSameTripBlockPipe } from '../pipes/timetable-station-find-other-trips-in-same-trip-block.pipe';

/** セルの上下の余白 */
const CELL_PADDING = 12;
/** 分の 1 行 */
const MINUTE_LINE = 24;
/** 左の列で、運用番号の前の間隔 4 + 運用番号 22 */
const OPERATION_LINE = 26;
/** 左の列で、編成の前の間隔 4 + 編成 15 */
const FORMATION_LINE = 19;
/** 右の列で、↪ 1 つあたり（間隔 4 を含む。最後の 1 つは間隔が要らないので 42k − 4） */
const OTHER_TRIP_LINE = 42;
/** セルどうしの縦の間隔（tw-gap-y-1） */
const CELL_GAP = 4;
/** セルの格子の上下の余白（tw-p-2） */
const GRID_PADDING = 16;

const others = new TimetableStationFindOtherTripsInSameTripBlockPipe();

/**
 * 駅別時刻表の 1 時の行の高さ（px）の見積もり。
 *
 * 1 列に並ぶ 559px 以下のスマホで、画面外の行を `content-visibility: auto` で描かないとき、
 * 行の高さを先に決めておくために使う（スクロールの長さが描画の前後で変わらないように）。
 * 式は 2026-10-28 に実機相当の幅で各セルの高さを測って決めた:
 * セル = max(左の列, 右の列)、行 = セルの合計 + セルの間 4px + 格子の上下 16px。
 *
 * - 左の列 = 12 + 24（分）+ 運用があれば 26 + さらに編成を出すなら 19
 * - 右の列 = 12 + 24 + ↪ が k 個（k ≥ 1）なら 42k − 4
 *   （↪ の数はセルと同じ TimetableStationFindOtherTripsInSameTripBlockPipe で数える）
 */
export function estimateStationRowHeight(
    trips: readonly TripDetailsDto[],
    showCurrentFormation: boolean,
): number {
    const cells = trips.reduce(
        (sum, trip) => sum + estimateCellHeight(trip, showCurrentFormation),
        0,
    );
    return cells + CELL_GAP * Math.max(trips.length - 1, 0) + GRID_PADDING;
}

function estimateCellHeight(
    trip: TripDetailsDto,
    showCurrentFormation: boolean,
): number {
    const hasOperation = (trip.tripOperationLists?.length ?? 0) !== 0;
    const left =
        CELL_PADDING +
        MINUTE_LINE +
        (hasOperation
            ? OPERATION_LINE + (showCurrentFormation ? FORMATION_LINE : 0)
            : 0);

    const k = others.transform(trip).length;
    const right =
        CELL_PADDING +
        MINUTE_LINE +
        (k >= 1 ? OTHER_TRIP_LINE * k - CELL_GAP : 0);

    return Math.max(left, right);
}
