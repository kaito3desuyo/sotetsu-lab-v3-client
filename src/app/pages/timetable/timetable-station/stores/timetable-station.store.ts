import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { format, parse } from 'date-fns';
import { minBy } from 'es-toolkit/compat';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { toServiceSeconds } from 'src/app/core/utils/railway-day';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

type StoreProps = {
    calendarId: CalendarDetailsDto['calendarId'] | null;
    stationId: StationDetailsDto['stationId'] | null;
    tripDirection: ETripDirection | null;
    calendar: CalendarDetailsDto | null;
    trips: TripDetailsDto[];
    tripBlocks: TripBlockDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    stations: StationDetailsDto[];
    operations: OperationDetailsDto[];
    /**
     * G1（充当編成「不明」バグ修正）: operation-real-time と同じキー付け方に統一する。
     * 配列で保持し expectedSighting.operation.operationNumber に一致するものを
     * 都度スキャンして探す旧実装は、その nested プロパティが API レスポンスで
     * 常に requestした operationNumber と一致する保証がなく「不明」の主因だった。
     * リクエストに使った operationNumber をそのままキーにした Record にすることで
     * 取得結果と紐付けを一致させる（operation-real-time.store.ts と同一パターン）。
     */
    operationSightingTimeCrossSections: Record<
        string,
        OperationSightingTimeCrossSectionDto
    >;
    hasFetchedTimetable: boolean;
    loadingQueue: boolean[];
};

/**
 * 圏外のために端末に保存する中身。充当編成（operationSightingTimeCrossSections）は
 * 「今日」で変わるので入れない。
 */
export type TimetableStationSnapshot = Pick<
    StoreProps,
    | 'calendar'
    | 'trips'
    | 'tripBlocks'
    | 'tripClasses'
    | 'stations'
    | 'operations'
>;

const store = createStore(
    { name: 'TimetableStationStore' },
    withProps<StoreProps>({
        calendarId: null,
        stationId: null,
        tripDirection: null,
        calendar: null,
        trips: [],
        tripBlocks: [],
        tripClasses: [],
        stations: [],
        operations: [],
        operationSightingTimeCrossSections: {},
        hasFetchedTimetable: false,
        loadingQueue: [],
    }),
);

function sortTrips(
    trips: TripDetailsDto[],
    tripBlocks: TripBlockDetailsDto[],
    stationId: StationDetailsDto['stationId'],
): TripDetailsDto[] {
    return trips
        .map((o) => ({
            ...o,
            tripBlock: tripBlocks.find(
                ({ tripBlockId }) => o.tripBlockId === tripBlockId,
            ),
        }))
        .map((o) => ({
            ...o,
            tripBlock: {
                ...o.tripBlock,
                trips: (o.tripBlock?.trips ?? []).sort((a, b) => {
                    const aTime = minBy(a.times, (o2) => o2.stopSequence);
                    const bTime = minBy(b.times, (o2) => o2.stopSequence);
                    if (!aTime || !bTime) return 0;
                    return (
                        toServiceSeconds(
                            aTime.departureDays,
                            aTime.departureTime,
                        ) -
                        toServiceSeconds(
                            bTime.departureDays,
                            bTime.departureTime,
                        )
                    );
                }),
            },
        }))
        .sort((a, b) => {
            const aStationTime = a.times.find((t) => t.stationId === stationId);
            const bStationTime = b.times.find((t) => t.stationId === stationId);
            const aDay =
                aStationTime?.departureDays ?? aStationTime?.arrivalDays ?? null;
            const aTime =
                aStationTime?.departureTime ?? aStationTime?.arrivalTime ?? null;
            const bDay =
                bStationTime?.departureDays ?? bStationTime?.arrivalDays ?? null;
            const bTime =
                bStationTime?.departureTime ?? bStationTime?.arrivalTime ?? null;

            return (
                toServiceSeconds(aDay, aTime) - toServiceSeconds(bDay, bTime)
            );
        });
}

function extractOperationIds(trips: TripDetailsDto[]): string[] {
    return Array.from(
        new Set(
            trips
                .filter((trip) => trip.tripOperationLists?.length)
                .map((trip) => trip.tripOperationLists?.[0]?.operationId),
        ),
    );
}

function generateTableData(
    trips: TripDetailsDto[],
    stationId: StationDetailsDto['stationId'],
): {
    day: number;
    hour: string;
    trips: TripDetailsDto[];
}[] {
    const data: {
        day: number;
        hour: string;
        trips: TripDetailsDto[];
    }[] = [];

    for (const trip of trips) {
        const stationTime = trip.times.find((t) => t.stationId === stationId);
        const day =
            stationTime?.departureDays ?? stationTime?.arrivalDays ?? null;
        const time =
            stationTime?.departureTime ?? stationTime?.arrivalTime ?? null;
        const hour = time
            ? format(parse(time, 'HH:mm:ss', new Date()), 'H')
            : null;

        const index = data.findIndex((o) => o.day === day && o.hour === hour);

        if (day && time && index !== -1) {
            data[index].trips.push(trip);
        } else if (day && time) {
            data.push({
                day,
                hour,
                trips: [trip],
            });
        } else {
            data.push({
                day: null,
                hour: '？',
                trips: [trip],
            });
        }
    }

    return data;
}

export const TimetableStationStore = {
    setCalendarId(calendarId: CalendarDetailsDto['calendarId']): void {
        store.update(setProp('calendarId', () => calendarId));
    },
    setStationId(stationId: StationDetailsDto['stationId']): void {
        store.update(setProp('stationId', () => stationId));
    },
    setTripDirection(tripDirection: ETripDirection): void {
        store.update(setProp('tripDirection', () => tripDirection));
    },
    setCalendar(calendar: CalendarDetailsDto): void {
        store.update(setProp('calendar', () => calendar));
    },
    setTrips(trips: TripDetailsDto[]): void {
        store.update(setProp('trips', () => trips));
    },
    setTripBlocks(tripBlocks: TripBlockDetailsDto[]): void {
        store.update(setProp('tripBlocks', () => tripBlocks));
    },
    setTripClasses(tripClasses: TripClassDetailsDto[]): void {
        store.update(setProp('tripClasses', () => tripClasses));
    },
    setStations(stations: StationDetailsDto[]): void {
        store.update(setProp('stations', () => stations));
    },
    setOperations(operations: OperationDetailsDto[]): void {
        store.update(setProp('operations', () => operations));
    },
    setOperationSightingTimeCrossSection(
        operationNumber: string,
        timeCrossSection: OperationSightingTimeCrossSectionDto,
    ): void {
        store.update(
            setProp('operationSightingTimeCrossSections', (state) => ({
                ...state,
                [operationNumber]: timeCrossSection,
            })),
        );
    },
    resetOperationSightingTimeCrossSections(): void {
        store.update(
            setProp('operationSightingTimeCrossSections', () => ({})),
        );
    },
    /** いまの駅・ダイヤ・方向の取得が終わったか（失敗しても true）。取る前は時刻表の代わりに骨組みを出す */
    setHasFetchedTimetable(value: boolean): void {
        store.update(setProp('hasFetchedTimetable', () => value));
    },
    enableLoading(): void {
        store.update(setProp('loadingQueue', (state) => state.concat(true)));
    },
    disableLoading(): void {
        store.update(setProp('loadingQueue', (state) => state.slice(1)));
    },
    resetLoading(): void {
        store.update(setProp('loadingQueue', () => []));
    },
    /** 圏外のために保存する中身を取り出す */
    snapshot(): TimetableStationSnapshot {
        const {
            calendar,
            trips,
            tripBlocks,
            tripClasses,
            stations,
            operations,
        } = store.getValue();
        return {
            calendar,
            trips,
            tripBlocks,
            tripClasses,
            stations,
            operations,
        };
    },
    /** 保存した中身を戻す（条件の calendarId・stationId・tripDirection は今のまま） */
    restoreSnapshot(data: TimetableStationSnapshot): void {
        store.update((state) => ({
            ...state,
            calendar: data.calendar,
            trips: data.trips,
            tripBlocks: data.tripBlocks,
            tripClasses: data.tripClasses,
            stations: data.stations,
            operations: data.operations,
        }));
    },

    calendarId$: store.pipe(select((state) => state.calendarId)),
    stationId$: store.pipe(select((state) => state.stationId)),
    tripDirection$: store.pipe(select((state) => state.tripDirection)),
    calendar$: store.pipe(select((state) => state.calendar)),
    trips$: store.pipe(select((state) => state.trips)),
    tripClasses$: store.pipe(select((state) => state.tripClasses)),
    stations$: store.pipe(select((state) => state.stations)),
    operations$: store.pipe(select((state) => state.operations)),
    operationSightingTimeCrossSections$: store.pipe(
        select((state) => state.operationSightingTimeCrossSections),
    ),
    hasFetchedTimetable$: store.pipe(
        select((state) => state.hasFetchedTimetable),
    ),
    isLoading$: store.pipe(select((state) => state.loadingQueue.length > 0)),

    timetableData$: combineLatest([
        store.pipe(select((state) => state.trips)),
        store.pipe(select((state) => state.tripBlocks)),
        store.pipe(select((state) => state.stationId)),
    ]).pipe(
        map(([trips, tripBlocks, stationId]) => ({
            trips: sortTrips(trips, tripBlocks, stationId),
            stationId,
        })),
        map(({ trips, stationId }) => generateTableData(trips, stationId)),
    ),

    get calendarId(): CalendarDetailsDto['calendarId'] | null {
        return store.getValue().calendarId;
    },
    get stationId(): StationDetailsDto['stationId'] | null {
        return store.getValue().stationId;
    },
    get tripDirection(): ETripDirection | null {
        return store.getValue().tripDirection;
    },
    get trips(): TripDetailsDto[] {
        return store.getValue().trips;
    },
    get tripBlocks(): TripBlockDetailsDto[] {
        return store.getValue().tripBlocks;
    },
    get operationIds(): string[] {
        return extractOperationIds(store.getValue().trips);
    },
    get operations(): OperationDetailsDto[] {
        return store.getValue().operations;
    },
    get operationSightingTimeCrossSections(): Record<
        string,
        OperationSightingTimeCrossSectionDto
    > {
        return store.getValue().operationSightingTimeCrossSections;
    },
} as const;
