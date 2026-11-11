import { getRailwayDate, toDisplayTime } from 'src/app/core/utils/railway-day';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
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
const DEADHEAD_CLASS_NAME = '回送';

function isDeadhead(trip: TripDetailsDto): boolean {
    return (
        baseTripClassName(trip.tripClass?.tripClassName) === DEADHEAD_CLASS_NAME
    );
}

/** trip の最初の時刻（days を含めた分）。並べるためだけに使う */
function firstMinute(trip: TripDetailsDto): number {
    const first = timedStops(trip.times)[0];
    const value = first?.departureTime ?? first?.arrivalTime;
    if (!first || !value) {
        return Number.POSITIVE_INFINITY;
    }
    const days =
        (first.departureTime ? first.departureDays : first.arrivalDays) ?? 1;
    const [h, m] = value.split(':').map(Number);
    return (days - 1) * 24 * 60 + h * 60 + m;
}

/**
 * 行先の駅。直通列車は、同じ tripBlock の中で回送を除いた最後の列車の終着駅
 * （ユーザー指示 2026-11-11）。選んだ列車そのものが回送なら、その列車の終着駅。
 */
function destinationStationId(
    trip: TripDetailsDto,
    blockTrips: readonly TripDetailsDto[],
): string | undefined {
    const own = timedStops(trip.times).at(-1)?.stationId;
    if (isDeadhead(trip)) {
        return own;
    }
    const last = [...blockTrips]
        .filter((t) => !isDeadhead(t))
        .sort((a, b) => firstMinute(a) - firstMinute(b))
        .at(-1);
    return (last && timedStops(last.times).at(-1)?.stationId) ?? own;
}

/**
 * ある駅に時刻のある列車を、基準時刻 at の前後の幅（両端を含む）で時刻順に返す。
 * 運用番号を持たない列車と休車（100）は含めない。
 * 行先は直通先まで含めた終着駅（destinationStationId）。
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
            const lastStationId = destinationStationId(trip, block.trips ?? []);
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
