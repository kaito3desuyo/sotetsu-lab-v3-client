import { getRailwayDate, toDisplayTime } from 'src/app/core/utils/railway-day';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import {
    resolveArrival,
    resolveDeparture,
    timedStops,
} from 'src/app/shared/train-position.util';
import { baseTripClassName } from 'src/app/shared/trip-class-base-name.util';
import { PickableTrain, PickerDirection } from './pickable-train.interface';

/** 休車（運用番号 100）は列車を持たない */
const IDLE_OPERATION_NUMBER = '100';
const DEFAULT_CLASS_COLOR = '#8a8a8a';
const MINUTE_MS = 60 * 1000;

/**
 * ある駅に時刻のある列車を、基準時刻 at の前後の幅（両端を含む）で時刻順に返す。
 * 運用番号を持たない列車と休車（100）は含めない。
 */
export function buildPickableTrains(input: {
    tripBlocks: readonly TripBlockDetailsDto[];
    stationId: string;
    at: Date;
    minutesBefore: number;
    minutesAfter: number;
    direction: PickerDirection;
    stationNameById: ReadonlyMap<string, string>;
}): PickableTrain[] {
    const { tripBlocks, stationId, at, direction, stationNameById } = input;
    const base = getRailwayDate(at);
    const from = at.getTime() - input.minutesBefore * MINUTE_MS;
    const to = at.getTime() + input.minutesAfter * MINUTE_MS;

    const trains: PickableTrain[] = [];
    for (const block of tripBlocks) {
        for (const trip of block.trips ?? []) {
            if (trip.tripId == null) {
                continue;
            }
            const tripDirection =
                trip.tripDirection === 0 ? 'inbound' : 'outbound';
            if (direction !== 'both' && direction !== tripDirection) {
                continue;
            }
            const operationNumber =
                trip.tripOperationLists?.[0]?.operation?.operationNumber;
            if (!operationNumber || operationNumber === IDLE_OPERATION_NUMBER) {
                continue;
            }
            const stop = (trip.times ?? []).find(
                (t) => t.stationId === stationId,
            );
            if (!stop) {
                continue;
            }
            const isArrivalOnly = stop.departureTime == null;
            const resolved = isArrivalOnly
                ? resolveArrival(base, stop)
                : resolveDeparture(base, stop);
            if (resolved === undefined) {
                continue;
            }
            const ms = resolved.getTime();
            if (ms < from || ms > to) {
                continue;
            }
            const displayValue = (
                isArrivalOnly ? stop.arrivalTime : stop.departureTime
            ) as string;
            const displayDays = isArrivalOnly
                ? stop.arrivalDays
                : (stop.departureDays ?? stop.arrivalDays);
            const lastStationId = timedStops(trip.times).at(-1)?.stationId;
            trains.push({
                tripId: trip.tripId,
                direction: tripDirection,
                time: resolved,
                displayTime: toDisplayTime(
                    (displayDays ?? 1) - 1,
                    displayValue,
                ),
                isArrivalOnly,
                isPast: ms < at.getTime(),
                tripNumber: trip.tripNumber ?? '',
                tripClassName: baseTripClassName(trip.tripClass?.tripClassName),
                tripClassColor:
                    trip.tripClass?.tripClassColor || DEFAULT_CLASS_COLOR,
                destinationName:
                    (lastStationId != null
                        ? stationNameById.get(lastStationId)
                        : undefined) ?? '',
                operationNumber,
                operationId: trip.tripOperationLists?.[0]?.operationId ?? '',
            });
        }
    }
    return trains.sort((a, b) => a.time.getTime() - b.time.getTime());
}
