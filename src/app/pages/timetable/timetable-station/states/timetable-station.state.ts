import { inject, Injectable } from '@angular/core';
import { select, setProps } from '@ngneat/elf';
import dayjs from 'dayjs';
import { minBy } from 'lodash-es';
import { zip } from 'rxjs';
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
    readonly timetableData$ = zip(
        this.#store.state.pipe(select((state) => state.trips)),
        this.#store.state.pipe(select((state) => state.tripBlocks)),
    ).pipe(map(this.#sortTrips), map(this.#generateTableData));
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
                trips.map((trip) => trip.tripOperationLists[0].operationId),
            ),
        );
    }

    #sortTrips([trips, tripBlocks]: [
        TripDetailsDto[],
        TripBlockDetailsDto[],
    ]): TripDetailsDto[] {
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
                    trips: o.tripBlock.trips.sort((a, b) => {
                        const aTime = minBy(a.times, (o2) => o2.stopSequence);
                        const bTime = minBy(b.times, (o2) => o2.stopSequence);
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
                const aDay =
                    a.times[0].departureDays || a.times[0].arrivalDays || null;
                const aTime =
                    a.times[0].departureTime || a.times[0].arrivalTime || null;
                const bDay =
                    b.times[0].departureDays || b.times[0].arrivalDays || null;
                const bTime =
                    b.times[0].departureTime || b.times[0].arrivalTime || null;

                const diff =
                    dayjs(aTime, 'HH:mm:ss')
                        .add(aDay - 1, 'days')
                        .unix() -
                    dayjs(bTime, 'HH:mm:ss')
                        .add(bDay - 1, 'days')
                        .unix();

                // 比較する時刻が同一で、発着どちらかの時刻がnullのtripは先に表示する
                // if (
                //     diff === 0 &&
                //     (b.times[0].departureTime === null ||
                //         b.times[0].arrivalTime === null)
                // ) {
                //     return 1;
                // }

                return diff;
            });
    }

    #generateTableData(trips: TripDetailsDto[]): {
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
            const day =
                trip.times[0].departureDays ||
                trip.times[0].arrivalDays ||
                null;
            const time =
                trip.times[0].departureTime ||
                trip.times[0].arrivalTime ||
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
