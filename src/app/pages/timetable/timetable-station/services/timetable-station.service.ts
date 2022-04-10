import { Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import dayjs from 'dayjs';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TripService } from 'src/app/libs/trip/usecase/trip.service';
import {
    TimetableStationStateQuery,
    TimetableStationStateStore,
} from '../../timetable-station/states/timetable-station.state';

@Injectable()
export class TimetableStationService {
    constructor(
        private readonly stationService: StationService,
        private readonly tripService: TripService,
        private readonly tripClassService: TripClassService,
        private readonly timetableStationStateStore: TimetableStationStateStore,
        private readonly timetableStationStateQuery: TimetableStationStateQuery,
        private readonly todaysCalendarListStateQuery: TodaysCalendarListStateQuery,
        private readonly operationService: OperationService,
        private readonly formationService: FormationService,
        private readonly operationSightingService: OperationSightingService
    ) {}

    // v2

    fetchTripsV2(): Observable<void> {
        const stationId = this.timetableStationStateQuery.stationId;
        const calendarId = this.timetableStationStateQuery.calendarId;
        const tripDirection = this.timetableStationStateQuery.tripDirection;
        const qb = new RequestQueryBuilder()
            .setJoin([
                { field: 'tripBlock' },
                { field: 'tripBlock.trips' },
                { field: 'tripBlock.trips.times' },
                { field: 'times' },
                { field: 'tripOperationLists' },
            ])
            .search({
                $and: [
                    {
                        calendarId: {
                            $eq: calendarId,
                        },
                    },
                    {
                        tripDirection: {
                            $eq: tripDirection,
                        },
                    },
                    {
                        ['times.stationId']: {
                            $eq: stationId,
                        },
                    },
                    {
                        $or: [
                            {
                                ['times.pickupType']: {
                                    $eq: 0,
                                },
                            },
                            {
                                ['times.dropoffType']: {
                                    $eq: 0,
                                },
                            },
                            {
                                $and: [
                                    {
                                        ['times.pickupType']: {
                                            $eq: 1,
                                        },
                                    },
                                    {
                                        ['times.dropoffType']: {
                                            $eq: 1,
                                        },
                                    },
                                    {
                                        $or: [
                                            {
                                                ['times.departureTime']: {
                                                    $notnull: true,
                                                },
                                            },
                                            {
                                                ['times.arrivalTime']: {
                                                    $notnull: true,
                                                },
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            })
            .sortBy([
                { field: 'times.arrivalDays', order: 'ASC' },
                { field: 'times.arrivalTime', order: 'ASC' },
                { field: 'times.departureDays', order: 'ASC' },
                { field: 'times.departureTime', order: 'ASC' },
            ]);

        return this.tripService.findMany(qb).pipe(
            tap((trips: TripDetailsDto[]) => {
                this.timetableStationStateStore.setTrips(trips);
            }),
            map(() => undefined)
        );
    }

    fetchStationsV2(): Observable<void> {
        const qb = new RequestQueryBuilder();

        return this.stationService.findMany(qb).pipe(
            tap((stations: StationDetailsDto[]) => {
                this.timetableStationStateStore.setStations(stations);
            }),
            map(() => undefined)
        );
    }

    fetchTripClassesV2(): Observable<void> {
        const qb = new RequestQueryBuilder();

        return this.tripClassService.findMany(qb).pipe(
            tap((tripClasses: TripClassDetailsDto[]) => {
                this.timetableStationStateStore.setTripClasses(tripClasses);
            }),
            map(() => undefined)
        );
    }

    fetchOperationsV2(): Observable<void> {
        const calendarId = this.timetableStationStateQuery.calendarId;

        const qb = new RequestQueryBuilder()
            .setFilter([
                {
                    field: 'calendarId',
                    operator: CondOperator.EQUALS,
                    value: calendarId, // this.todaysCalendarListStateQuery.todaysCalendarId,
                },
            ])
            .sortBy([{ field: 'operationNumber', order: 'ASC' }]);

        return this.operationService.findMany(qb).pipe(
            tap((data: OperationDetailsDto[]) => {
                this.timetableStationStateStore.setOperations(data);
            }),
            map(() => undefined)
        );
    }

    fetchFormationsV2(): Observable<void> {
        const qb = new RequestQueryBuilder();

        return this.formationService
            .findManyBySpeficicDate(qb, {
                date: dayjs()
                    .subtract(dayjs().hour() < 4 ? 1 : 0, 'days')
                    .format('YYYY-MM-DD'),
            })
            .pipe(
                tap((data: FormationDetailsDto[]) => {
                    this.timetableStationStateStore.setFormations(data);
                }),
                map(() => undefined)
            );
    }

    fetchOperationSightings(): Observable<void> {
        const qb = new RequestQueryBuilder().setJoin([
            { field: 'operation' },
            { field: 'formation' },
        ]);

        return this.operationSightingService
            .findManyLatestGroupByOperation(qb)
            .pipe(
                tap((data: OperationSightingDetailsDto[]) => {
                    this.timetableStationStateStore.setOperationSightings(data);
                }),
                map(() => undefined)
            );
    }

    fetchFormationSightings(): Observable<void> {
        const qb = new RequestQueryBuilder().setJoin([
            { field: 'operation' },
            { field: 'formation' },
        ]);

        return this.operationSightingService
            .findManyLatestGroupByFormation(qb)
            .pipe(
                tap((data: OperationSightingDetailsDto[]) => {
                    this.timetableStationStateStore.setFormationSightings(data);
                }),
                map(() => undefined)
            );
    }
}
