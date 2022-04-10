import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import dayjs from 'dayjs';
import { map } from 'rxjs/operators';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { findLatestAndCirculateOperationSighting } from 'src/app/pages/operation/operation-real-time/utils/find-latest-and-circulate-operation-sighting';

type TimetableStationState = {
    calendarId: CalendarDetailsDto['calendarId'];
    stationId: StationDetailsDto['stationId'];
    tripDirection: TripDetailsDto['tripDirection'];
    trips: TripDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    stations: StationDetailsDto[];
    operations: OperationDetailsDto[];
    formations: FormationDetailsDto[];
    operationSightings: OperationSightingDetailsDto[];
    formationSightings: OperationSightingDetailsDto[];
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
                tripClasses: [],
                stations: [],
                operations: [],
                formations: [],
                operationSightings: [],
                formationSightings: [],
            },
            { name: `TimetableStation-${guid()}` }
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

    setFormations(formations: FormationDetailsDto[]): void {
        this.update({
            formations,
        });
    }

    setOperationSightings(sightings: OperationSightingDetailsDto[]): void {
        this.update({
            operationSightings: sightings,
        });
    }

    setFormationSightings(sightings: OperationSightingDetailsDto[]): void {
        this.update({
            formationSightings: sightings,
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
        })
    );
    readonly tripDirection$ = this.select('tripDirection');
    readonly trips$ = this.select('trips');
    readonly timetableData$ = this.select('trips').pipe(
        map(this._sortTrips),
        map(this._generateTableData)
    );
    readonly tripClasses$ = this.select('tripClasses');
    readonly stations$ = this.select('stations');
    readonly operations$ = this.select('operations');
    readonly formations$ = this.select('formations');
    readonly latestSightings$ = this.select([
        'operations',
        'operationSightings',
        'formationSightings',
    ]).pipe(
        map(findLatestAndCirculateOperationSighting),
        map((data) => data.operationSightings)
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

    constructor(protected store: TimetableStationStateStore) {
        super(store);
    }

    private _sortTrips(trips: TripDetailsDto[]): TripDetailsDto[] {
        return trips.sort((a, b) => {
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

    private _generateTableData(trips: TripDetailsDto[]): {
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
                (o) => o.day === day && o.hour === hour
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
