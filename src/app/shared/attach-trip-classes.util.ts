import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';

/**
 * 項目を絞って取った列車データ（種別の中身を含まない）に、種別の一覧から種別（名前・色）を補う純関数。
 * trip の tripClassId で引く。一覧に無い種別・すでに種別を持つ trip はそのまま。元のデータは書き換えない。
 */
export function attachTripClasses(
    tripBlocksByDirection: Readonly<Record<number, TripBlockDetailsDto[]>>,
    tripClasses: readonly TripClassDetailsDto[],
): Record<number, TripBlockDetailsDto[]> {
    const byId = new Map(tripClasses.map((c) => [c.tripClassId, c]));
    return Object.fromEntries(
        Object.entries(tripBlocksByDirection).map(([direction, blocks]) => [
            direction,
            blocks.map((block) => ({
                ...block,
                trips: block.trips?.map((trip) => {
                    const tripClass =
                        trip.tripClass ??
                        (trip.tripClassId
                            ? byId.get(trip.tripClassId)
                            : undefined);
                    return tripClass ? { ...trip, tripClass } : trip;
                }),
            })),
        ]),
    ) as Record<number, TripBlockDetailsDto[]>;
}
