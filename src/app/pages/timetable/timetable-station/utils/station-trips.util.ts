import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

/**
 * 運行（trip-block）の一覧から、その駅に停まる列車を API `/v3/trips/station/:stationId` と同じ条件・順で取り出す。
 *
 * 条件: その駅の時刻が乗車可か降車可、または乗降とも不可でも時刻がある（運転停車など）。
 * 順: その駅の着（日・時刻）→ 発（日・時刻）、空は後ろ。
 * 方向ごとの運行は取得結果がキャッシュされるので、駅を切り替えても取り直さずに済む。
 */
export function stationTrips(
    tripBlocks: readonly TripBlockDetailsDto[],
    stationId: string,
    tripDirection: number,
): TripDetailsDto[] {
    return tripBlocks
        .flatMap((block) => block.trips ?? [])
        .filter((trip) => trip.tripDirection === tripDirection)
        .map((trip) => ({
            trip,
            time: (trip.times ?? []).find(
                (time) => time.stationId === stationId,
            ),
        }))
        .filter(
            (entry): entry is { trip: TripDetailsDto; time: TimeDetailsDto } =>
                !!entry.time && stopsAt(entry.time),
        )
        .sort((a, b) => compareStationTime(a.time, b.time))
        .map(({ trip }) => trip);
}

function stopsAt(time: TimeDetailsDto): boolean {
    return (
        time.pickupType === 0 ||
        time.dropoffType === 0 ||
        (time.pickupType === 1 &&
            time.dropoffType === 1 &&
            (!!time.departureTime || !!time.arrivalTime))
    );
}

function compareStationTime(a: TimeDetailsDto, b: TimeDetailsDto): number {
    return (
        compareNullsLast(a.arrivalDays, b.arrivalDays) ||
        compareNullsLast(a.arrivalTime, b.arrivalTime) ||
        compareNullsLast(a.departureDays, b.departureDays) ||
        compareNullsLast(a.departureTime, b.departureTime)
    );
}

function compareNullsLast<T extends number | string>(
    a: T | null | undefined,
    b: T | null | undefined,
): number {
    const aEmpty = a === null || a === undefined;
    const bEmpty = b === null || b === undefined;
    if (aEmpty || bEmpty) return Number(aEmpty) - Number(bEmpty);
    return a < b ? -1 : a > b ? 1 : 0;
}
