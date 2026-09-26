import { format } from 'date-fns';
import { getRailwayDate } from 'src/app/core/utils/railway-day';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import {
    TrainPosition,
    findContinuations,
    resolveArrival,
    resolveDeparture,
} from 'src/app/shared/train-position.util';
import { baseTripClassName } from 'src/app/shared/trip-class-base-name.util';
import { TrainLocationCard } from '../interfaces/train-location-card.interface';
import {
    StationArrival,
    StationArrivals,
} from '../interfaces/station-arrival.interface';

/** 駅の欄に方向ごとに出す本数（spec: 各方向 6 本まで） */
export const STATION_ARRIVALS_LIMIT = 6;

export interface BuildStationArrivalsInput {
    tripBlocks: readonly TripBlockDetailsDto[];
    stationId: string;
    at: Date;
    positions: readonly TrainPosition[];
    cardsById: ReadonlyMap<string, TrainLocationCard>;
    /** 全駅の stationId → 駅名（始発駅・位置の駅名に使う） */
    stationNameById: ReadonlyMap<string, string>;
    /** stationId → その駅を含む路線名（図の外を走る列車の「いま ○○線内」に使う） */
    routeNamesByStationId: ReadonlyMap<string, readonly string[]>;
    limit: number;
}

function hasTime(time: TimeDetailsDto): boolean {
    return time.arrivalTime != null || time.departureTime != null;
}

/**
 * 選んだ駅の時刻を求める。停車は着（無ければ発）、通過は前後の停車点の時刻を
 * stopSequence の比で按分する（駅間距離のデータが無いため）。求まらなければ undefined。
 */
function resolveStationTime(
    times: readonly TimeDetailsDto[],
    index: number,
    base: Date,
): { time: Date; departure?: Date; isPassing: boolean } | undefined {
    const target = times[index];
    if (hasTime(target)) {
        const time = resolveArrival(base, target);
        return time
            ? {
                  time,
                  departure: resolveDeparture(base, target),
                  isPassing: false,
              }
            : undefined;
    }

    let prev = index - 1;
    while (prev >= 0 && !hasTime(times[prev])) prev--;
    let next = index + 1;
    while (next < times.length && !hasTime(times[next])) next++;
    if (prev < 0 || next >= times.length) {
        return undefined;
    }

    const from = resolveDeparture(base, times[prev]);
    const to = resolveArrival(base, times[next]);
    const seqFrom = times[prev].stopSequence ?? prev;
    const seqTo = times[next].stopSequence ?? next;
    const seq = target.stopSequence ?? index;
    if (!from || !to || seqTo === seqFrom) {
        return undefined;
    }
    const ratio = (seq - seqFrom) / (seqTo - seqFrom);
    return {
        time: new Date(
            from.getTime() + (to.getTime() - from.getTime()) * ratio,
        ),
        isPassing: true,
    };
}

/**
 * 図の外（他線）にいる列車のいまどこか。始発を出る前は「始発駅 HH:mm 発」、
 * 出たあとは、いまいる区間（停車中の駅、または前後の停車駅）を含む路線名で「いま ○○線内」。
 * 路線が分からなければ「いま 他線内」。
 */
function buildOffAxisWhereText(
    times: readonly TimeDetailsDto[],
    base: Date,
    at: Date,
    input: BuildStationArrivalsInput,
): string {
    const stops = times.filter(hasTime);
    const origin = stops[0];
    const originDeparture = origin ? resolveDeparture(base, origin) : undefined;
    if (!origin || !originDeparture) {
        return '';
    }
    if (at < originDeparture) {
        const originName = origin.stationId
            ? (input.stationNameById.get(origin.stationId) ?? '')
            : '';
        return `${originName} ${format(originDeparture, 'HH:mm')} 発`;
    }

    let current = 0;
    for (let i = 0; i < stops.length; i++) {
        const arrival = resolveArrival(base, stops[i]);
        if (arrival !== undefined && arrival <= at) {
            current = i;
        }
    }
    const currentDeparture = resolveDeparture(base, stops[current]);
    const segment =
        currentDeparture !== undefined && at < currentDeparture
            ? [stops[current]]
            : [stops[current], stops[current + 1]];
    const routeNameSets = segment
        .filter((t): t is TimeDetailsDto => t !== undefined)
        .map((t) =>
            t.stationId
                ? (input.routeNamesByStationId.get(t.stationId) ?? [])
                : [],
        );
    const [first = [], ...rest] = routeNameSets;
    const routeName = first.find((name) =>
        rest.every((names) => names.includes(name)),
    );
    return routeName ? `いま ${routeName}内` : 'いま 他線内';
}

function buildWhereText(
    position: TrainPosition | undefined,
    times: readonly TimeDetailsDto[],
    base: Date,
    at: Date,
    input: BuildStationArrivalsInput,
): string {
    const name = (id: string | undefined) =>
        id ? (input.stationNameById.get(id) ?? '') : '';
    if (position?.type === 'stopped') {
        return `いま ${name(position.stationId)}に停車中`;
    }
    if (position?.type === 'between') {
        return `いま ${name(position.fromStationId)}→${name(position.toStationId)}`;
    }
    return buildOffAxisWhereText(times, base, at, input);
}

function buildArrival(
    trip: TripDetailsDto,
    times: readonly TimeDetailsDto[],
    index: number,
    input: BuildStationArrivalsInput,
    base: Date,
    positionByTripId: ReadonlyMap<string, TrainPosition>,
    continuation: TripDetailsDto | undefined,
): StationArrival | undefined {
    const resolved = resolveStationTime(times, index, base);
    if (!resolved || !trip.tripId) {
        return undefined;
    }
    const lastStop = [...times].reverse().find(hasTime);
    const isLastStop =
        !resolved.isPassing &&
        index === times.indexOf(lastStop as TimeDetailsDto);
    // 種別変更・列番の付け替え: 同じ編成が次の列番で発つまでは停車中（発時刻は次の列車の始発）
    const continuationFirst =
        isLastStop && continuation
            ? [...(continuation.times ?? [])]
                  .filter(hasTime)
                  .sort(
                      (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
                  )[0]
            : undefined;
    const { time, isPassing } = resolved;
    const departure = continuationFirst
        ? resolveDeparture(base, continuationFirst)
        : resolved.departure;
    const continuationCard =
        continuationFirst && continuation?.tripId
            ? input.cardsById.get(continuation.tripId)
            : undefined;
    const isStopped =
        !isPassing &&
        time <= input.at &&
        departure !== undefined &&
        input.at < departure;
    if (time < input.at && !isStopped) {
        return undefined;
    }

    const card = input.cardsById.get(trip.tripId);
    return {
        tripId: trip.tripId,
        direction:
            trip.tripDirection === ETripDirection.INBOUND
                ? 'inbound'
                : 'outbound',
        time,
        departureTime:
            !isPassing &&
            departure !== undefined &&
            departure.getTime() !== time.getTime()
                ? departure
                : undefined,
        minutesUntil: isStopped
            ? 0
            : (time.getTime() - input.at.getTime()) / 60000,
        isPassing,
        isTerminal: isLastStop && !continuationFirst,
        isOrigin: !isPassing && index === times.findIndex(hasTime),
        continuation:
            continuationFirst && continuation
                ? {
                      tripNumber:
                          continuationCard?.tripNumber ??
                          continuation.tripNumber ??
                          '',
                      tripClassName:
                          continuationCard?.tripClassName ??
                          baseTripClassName(
                              continuation.tripClass?.tripClassName,
                          ),
                      tripClassColor:
                          continuationCard?.tripClassColor ??
                          continuation.tripClass?.tripClassColor ??
                          '#8a8a8a',
                  }
                : undefined,
        isStopped,
        tripNumber: card?.tripNumber ?? trip.tripNumber ?? '',
        tripClassName:
            card?.tripClassName ??
            baseTripClassName(trip.tripClass?.tripClassName),
        tripClassColor:
            card?.tripClassColor ?? trip.tripClass?.tripClassColor ?? '#8a8a8a',
        destinationName:
            card?.destinationName ??
            (lastStop?.stationId
                ? (input.stationNameById.get(lastStop.stationId) ?? '')
                : ''),
        operationNumber:
            card?.operationNumber ??
            trip.tripOperationLists?.[0]?.operation?.operationNumber,
        operationId:
            card?.operationId ?? trip.tripOperationLists?.[0]?.operationId,
        formationNumber: card?.formationNumber,
        formationAgencyName: card?.formationAgencyName,
        whereText: isStopped
            ? `いま ${input.stationNameById.get(input.stationId) ?? ''}に停車中`
            : buildWhereText(
                  positionByTripId.get(trip.tripId),
                  times,
                  base,
                  input.at,
                  input,
              ),
    };
}

/**
 * 選んだ駅に次に来る列車を、上り・下りそれぞれ時刻の早い順に limit 本まで返す純関数。
 * 通過・回送も含める。時刻の解釈（null・1 始まりの days・営業日）は
 * `estimatePositions` と同じ `resolveArrival` / `resolveDeparture` に従う。
 */
export function buildStationArrivals(
    input: BuildStationArrivalsInput,
): StationArrivals {
    const base = getRailwayDate(input.at);
    const positionByTripId = new Map(input.positions.map((p) => [p.tripId, p]));
    const continuations = findContinuations(input.tripBlocks);
    const continuedTripIds = new Set(
        [...continuations.values()].map((next) => next.tripId),
    );
    const all: StationArrival[] = [];

    for (const block of input.tripBlocks) {
        for (const trip of block.trips ?? []) {
            const times = [...(trip.times ?? [])].sort(
                (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
            );
            const index = times.findIndex(
                (t) => t.stationId === input.stationId,
            );
            if (index < 0) {
                continue;
            }
            // 引き継ぎ先の列車が選んだ駅から発つ行は、着く列車の行にまとめる（同じ編成を 2 行に出さない）
            const isContinuationStart =
                continuedTripIds.has(trip.tripId) &&
                times.findIndex(hasTime) === index;
            if (isContinuationStart) {
                continue;
            }
            const arrival = buildArrival(
                trip,
                times,
                index,
                input,
                base,
                positionByTripId,
                trip.tripId ? continuations.get(trip.tripId) : undefined,
            );
            if (arrival) {
                all.push(arrival);
            }
        }
    }

    all.sort((a, b) => a.time.getTime() - b.time.getTime());
    return {
        inbound: all
            .filter((a) => a.direction === 'inbound')
            .slice(0, input.limit),
        outbound: all
            .filter((a) => a.direction === 'outbound')
            .slice(0, input.limit),
    };
}
