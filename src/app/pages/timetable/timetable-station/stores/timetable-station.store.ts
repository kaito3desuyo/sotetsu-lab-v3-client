import { createStore, select, setProp, withProps } from '@ngneat/elf';
import dayjs from 'dayjs';
import { minBy } from 'lodash-es';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
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
    loadingQueue: boolean[];
};

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
                    const format = 'HH:mm:ss';
                    return (
                        dayjs(aTime.departureTime, format)
                            .add(aTime.departureDays - 1, 'days')
                            .unix() -
                        dayjs(bTime.departureTime, format)
                            .add(bTime.departureDays - 1, 'days')
                            .unix()
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
                dayjs(aTime, 'HH:mm:ss')
                    .add(aDay - 1, 'days')
                    .unix() -
                dayjs(bTime, 'HH:mm:ss')
                    .add(bDay - 1, 'days')
                    .unix()
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
        const hour = dayjs(time, 'HH:mm:ss').format('H');

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
    enableLoading(): void {
        store.update(setProp('loadingQueue', (state) => state.concat(true)));
    },
    disableLoading(): void {
        store.update(setProp('loadingQueue', (state) => state.slice(1)));
    },
    resetLoading(): void {
        store.update(setProp('loadingQueue', () => []));
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
    isLoading$: store.pipe(select((state) => state.loadingQueue.length > 0)),

    stationName$: store.pipe(
        select((state) => ({
            stationId: state.stationId,
            stations: state.stations,
        })),
        map(
            ({ stationId, stations }) =>
                stations.find((o) => o.stationId === stationId)?.stationName,
        ),
    ),
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
