import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import dayjs from 'dayjs';
import { minBy } from 'lodash-es';
import { zip } from 'rxjs';
import { map } from 'rxjs/operators';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

type TimetableStationState = {
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
export class TimetableStationStateStore extends Store<TimetableStationState> {
    constructor() {
        super(
            {
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
            { name: `TimetableStation-${guid()}` },
        );
    }

    setCalendarId(calendarId: CalendarDetailsDto['calendarId']): void {
        this.update({
            calendarId,
        });
    }

    setStationId(stationId: StationDetailsDto['stationId']): void {
        this.update({
            stationId,
        });
    }

    setTripDirection(tripDirection: TripDetailsDto['tripDirection']): void {
        this.update({
            tripDirection,
        });
    }

    setTrips(trips: TripDetailsDto[]): void {
        this.update({
            trips,
        });
    }

    setTripBlocks(tripBlocks: TripBlockDetailsDto[]): void {
        this.update({
            tripBlocks,
        });
    }

    setTripClasses(tripClasses: TripClassDetailsDto[]): void {
        this.update({
            tripClasses,
        });
    }

    setStations(stations: StationDetailsDto[]): void {
        this.update({
            stations,
        });
    }

    setOperations(operations: OperationDetailsDto[]): void {
        this.update({
            operations,
        });
    }

    setOperationSightingTimeCrossSections(
        operationSightingTimeCrossSections: OperationSightingTimeCrossSectionDto[],
    ): void {
        this.update({
            operationSightingTimeCrossSections,
        });
    }
}

@Injectable()
export class TimetableStationStateQuery extends Query<TimetableStationState> {
    readonly calendarId$ = this.select('calendarId');
    readonly stationId$ = this.select('stationId');
    readonly stationName$ = this.select(['stationId', 'stations']).pipe(
        map(({ stationId, stations }) => {
            return stations.find((o) => o.stationId === stationId)?.stationName;
        }),
    );
    readonly tripDirection$ = this.select('tripDirection');
    readonly trips$ = this.select('trips');
    readonly timetableData$ = zip(
        this.select('trips'),
        this.select('tripBlocks'),
    ).pipe(map(this.#sortTrips), map(this.#generateTableData));
    readonly tripClasses$ = this.select('tripClasses');
    readonly stations$ = this.select('stations');
    readonly operations$ = this.select('operations');
    readonly operationSightingTimeCrossSections$ = this.select(
        'operationSightingTimeCrossSections',
    );

    get stationId(): StationDetailsDto['stationId'] {
        return this.getValue().stationId;
    }

    get calendarId(): CalendarDetailsDto['calendarId'] {
        return this.getValue().calendarId;
    }

    get tripDirection(): TripDetailsDto['tripDirection'] {
        return this.getValue().tripDirection;
    }

    get trips(): TripDetailsDto[] {
        return this.getValue().trips;
    }

    get operationIds(): string[] {
        return this.#extractOperationIds(this.getValue().trips);
    }

    get operations(): OperationDetailsDto[] {
        return this.getValue().operations;
    }

    constructor(protected store: TimetableStationStateStore) {
        super(store);
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
