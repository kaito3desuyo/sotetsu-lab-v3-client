import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { DiagramDirectionFilter } from '../stores/train-diagram.store';

/**
 * 方向フィルタ（上り/下り/両方）に応じて tripBlocksByDirection を絞り込む。
 * キーは tripDirection（0=INBOUND=上り / 1=OUTBOUND=下り）。
 * - 'up'   → INBOUND(0) のキーのみ
 * - 'down' → OUTBOUND(1) のキーのみ
 * - 'both' → 全キー（元の Record をそのまま返す）
 *
 * chart 側を変更せずに済むよう、component 側で絞った Record を渡す前提の純関数。
 */
export function filterTripBlocksByDirection(
    tripBlocksByDirection: Record<number, TripBlockDetailsDto[]>,
    directionFilter: DiagramDirectionFilter,
): Record<number, TripBlockDetailsDto[]> {
    if (directionFilter === 'both') {
        return tripBlocksByDirection;
    }

    const targetDirection =
        directionFilter === 'up'
            ? ETripDirection.INBOUND
            : ETripDirection.OUTBOUND;

    const filtered: Record<number, TripBlockDetailsDto[]> = {};
    for (const [key, blocks] of Object.entries(tripBlocksByDirection)) {
        if (Number(key) === targetDirection) {
            filtered[Number(key)] = blocks;
        }
    }
    return filtered;
}
