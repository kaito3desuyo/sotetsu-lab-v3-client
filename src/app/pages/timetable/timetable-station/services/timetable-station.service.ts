import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
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
        private readonly timetableStationStateQuery: TimetableStationStateQuery
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
}
