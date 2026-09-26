import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TrainPosition } from 'src/app/shared/train-position.util';
import { TrainLocationCard } from '../interfaces/train-location-card.interface';

/**
 * 図のカード用に、種別が変わる駅（次の列番へ引き継ぐ駅）に着いて停車中の列車のカードを
 * 変更後の種別・色・列番にした辞書を返す純関数。着くまでは変更前のまま
 * （ユーザー指示 2026-09-26: 変更後にするのは種別変更駅に到着してから）。
 * 行先・運用・編成は同じ運用のまとまりなので変えない。元の辞書は書き換えない。
 */
export function applyContinuationsToCards(
    cardsById: ReadonlyMap<string, TrainLocationCard>,
    continuations: ReadonlyMap<string, TripDetailsDto>,
    positions: readonly TrainPosition[],
): ReadonlyMap<string, TrainLocationCard> {
    const result = new Map(cardsById);
    for (const position of positions) {
        if (position.type !== 'stopped') {
            continue;
        }
        const next = continuations.get(position.tripId);
        const changeStationId = [...(next?.times ?? [])]
            .filter((t) => t.arrivalTime != null || t.departureTime != null)
            .sort(
                (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
            )[0]?.stationId;
        const current = cardsById.get(position.tripId);
        const after = next?.tripId ? cardsById.get(next.tripId) : undefined;
        if (!current || !after || changeStationId !== position.stationId) {
            continue;
        }
        result.set(position.tripId, {
            ...current,
            tripNumber: after.tripNumber,
            tripClassName: after.tripClassName,
            tripClassColor: after.tripClassColor,
        });
    }
    return result;
}
