import { AllKeys } from 'src/app/core/utils/all-keys';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';

// 展開（...）はビルドで遅い補助関数になるため、項目を書き並べて浅いコピーを作る。
function withTripClass(
    trip: TripDetailsDto,
    tripClass: TripClassDetailsDto,
): TripDetailsDto {
    const next: AllKeys<TripDetailsDto> = {
        tripId: trip.tripId,
        serviceId: trip.serviceId,
        tripNumber: trip.tripNumber,
        tripClassId: trip.tripClassId,
        tripName: trip.tripName,
        tripDirection: trip.tripDirection,
        tripBlockId: trip.tripBlockId,
        depotIn: trip.depotIn,
        depotOut: trip.depotOut,
        calendarId: trip.calendarId,
        extraCalendarId: trip.extraCalendarId,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt,
        times: trip.times,
        tripOperationLists: trip.tripOperationLists,
        tripClass,
        tripBlock: trip.tripBlock,
    };
    return next;
}

function withTrips(
    block: TripBlockDetailsDto,
    trips: TripDetailsDto[] | undefined,
): TripBlockDetailsDto {
    const next: AllKeys<TripBlockDetailsDto> = {
        tripBlockId: block.tripBlockId,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt,
        trips,
    };
    return next;
}

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
            blocks.map((block) =>
                withTrips(
                    block,
                    block.trips?.map((trip) => {
                        const tripClass =
                            trip.tripClass ??
                            (trip.tripClassId
                                ? byId.get(trip.tripClassId)
                                : undefined);
                        return tripClass
                            ? withTripClass(trip, tripClass)
                            : trip;
                    }),
                ),
            ),
        ]),
    ) as Record<number, TripBlockDetailsDto[]>;
}
