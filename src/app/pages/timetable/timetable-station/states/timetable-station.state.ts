import { inject, Injectable } from '@angular/core';
import { select, setProps } from '@ngneat/elf';
import dayjs from 'dayjs';
import { minBy } from 'lodash-es';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { createElfStore } from 'src/app/core/utils/elf-store';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

type State = {
    calendarId: CalendarDetailsDto['calendarId'];
    calendar: CalendarDetailsDto | null;
    stationId: StationDetailsDto['stationId'];
    tripDirection: TripDetailsDto['tripDirection'];
    trips: TripDetailsDto[];
    tripBlocks: TripBlockDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    stations: StationDetailsDto[];
    operations: OperationDetailsDto[];
    operationSightingTimeCrossSections: OperationSightingTimeCrossSectionDto[];
};

@Injectable()
export class TimetableStationStateStore {
    readonly state = createElfStore<State>({
        name: 'TimetableStation',
        initialValue: {
            calendarId: null,
            calendar: null,
            stationId: null,
            tripDirection: null,
            trips: [],
            tripBlocks: [],
            tripClasses: [],
            stations: [],
            operations: [],
            operationSightingTimeCrossSections: [],
        },
    });

    setCalendarId(calendarId: CalendarDetailsDto['calendarId']): void {
        this.state.update(
            setProps({
                calendarId,
            }),
        );
    }

    setCalendar(calendar: CalendarDetailsDto): void {
        this.state.update(
            setProps({
                calendar,
            }),
        );
    }

    setStationId(stationId: StationDetailsDto['stationId']): void {
        this.state.update(
            setProps({
                stationId,
            }),
        );
    }

    setTripDirection(tripDirection: TripDetailsDto['tripDirection']): void {
        this.state.update(
            setProps({
                tripDirection,
            }),
        );
    }

    setTrips(trips: TripDetailsDto[]): void {
        this.state.update(
            setProps({
                trips,
            }),
        );
    }

    setTripBlocks(tripBlocks: TripBlockDetailsDto[]): void {
        this.state.update(
            setProps({
                tripBlocks,
            }),
        );
    }

    setTripClasses(tripClasses: TripClassDetailsDto[]): void {
        this.state.update(
            setProps({
                tripClasses,
            }),
        );
    }

    setStations(stations: StationDetailsDto[]): void {
        this.state.update(
            setProps({
                stations,
            }),
        );
    }

    setOperations(operations: OperationDetailsDto[]): void {
        this.state.update(
            setProps({
                operations,
            }),
        );
    }

    setOperationSightingTimeCrossSections(
        operationSightingTimeCrossSections: OperationSightingTimeCrossSectionDto[],
    ): void {
        this.state.update(
            setProps({
                operationSightingTimeCrossSections,
            }),
        );
    }
}

@Injectable()
export class TimetableStationStateQuery {
    readonly #store = inject(TimetableStationStateStore);

    readonly calendarId$ = this.#store.state.pipe(
        select((state) => state.calendarId),
    );
    readonly calendar$ = this.#store.state.pipe(
        select((state) => state.calendar),
    );
    readonly stationId$ = this.#store.state.pipe(
        select((state) => state.stationId),
    );
    readonly stationName$ = this.#store.state.pipe(
        select((state) => ({
            stationId: state.stationId,
            stations: state.stations,
        })),
        map(({ stationId, stations }) => {
            return stations.find((o) => o.stationId === stationId)?.stationName;
        }),
    );
    readonly tripDirection$ = this.#store.state.pipe(
        select((state) => state.tripDirection),
    );
    readonly trips$ = this.#store.state.pipe(select((state) => state.trips));
    readonly timetableData$ = combineLatest([
        this.#store.state.pipe(select((state) => state.trips)),
        this.#store.state.pipe(select((state) => state.tripBlocks)),
    ]).pipe(
        map(([trips, tripBlocks]) => this.#sortTrips([trips, tripBlocks])),
        map((trips) => this.#generateTableData(trips)),
    );
    readonly tripClasses$ = this.#store.state.pipe(
        select((state) => state.tripClasses),
    );
    readonly stations$ = this.#store.state.pipe(
        select((state) => state.stations),
    );
    readonly operations$ = this.#store.state.pipe(
        select((state) => state.operations),
    );
    readonly operationSightingTimeCrossSections$ = this.#store.state.pipe(
        select((state) => state.operationSightingTimeCrossSections),
    );

    get stationId(): StationDetailsDto['stationId'] {
        const { stationId } = this.#store.state.getValue();
        return stationId;
    }

    get calendarId(): CalendarDetailsDto['calendarId'] {
        const { calendarId } = this.#store.state.getValue();
        return calendarId;
    }

    get calendar(): CalendarDetailsDto | null {
        const { calendar } = this.#store.state.getValue();
        return calendar;
    }

    get tripDirection(): TripDetailsDto['tripDirection'] {
        const { tripDirection } = this.#store.state.getValue();
        return tripDirection;
    }

    get trips(): TripDetailsDto[] {
        const { trips } = this.#store.state.getValue();
        return trips;
    }

    get operationIds(): string[] {
        const { trips } = this.#store.state.getValue();
        return this.#extractOperationIds(trips);
    }

    get operations(): OperationDetailsDto[] {
        const { operations } = this.#store.state.getValue();
        return operations;
    }

    #extractOperationIds(trips: TripDetailsDto[]): string[] {
        return Array.from(
            new Set(
                trips
                    .filter((trip) => trip.tripOperationLists?.length)
                    .map((trip) => trip.tripOperationLists?.[0]?.operationId),
            ),
        );
    }

    #sortTrips([trips, tripBlocks]: [
        TripDetailsDto[],
        TripBlockDetailsDto[],
    ]): TripDetailsDto[] {
        const { stationId } = this.#store.state.getValue();

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

                const diff =
                    dayjs(aTime, 'HH:mm:ss')
                        .add(aDay - 1, 'days')
                        .unix() -
                    dayjs(bTime, 'HH:mm:ss')
                        .add(bDay - 1, 'days')
                        .unix();

                return diff;
            });
    }

    #generateTableData(trips: TripDetailsDto[]): {
        day: number;
        hour: string;
        trips: TripDetailsDto[];
    }[] {
        const { stationId } = this.#store.state.getValue();
        const data: {
            day: number;
            hour: string;
            trips: TripDetailsDto[];
        }[] = [];

        for (const trip of trips) {
            const stationTime = trip.times.find((t) => t.stationId === stationId);
            const day =
                stationTime?.departureDays ??
                stationTime?.arrivalDays ??
                null;
            const time =
                stationTime?.departureTime ??
                stationTime?.arrivalTime ??
                null;
            const hour = dayjs(time, 'HH:mm:ss').format('H');

            const index = data.findIndex(
                (o) => o.day === day && o.hour === hour,
            );

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
}
