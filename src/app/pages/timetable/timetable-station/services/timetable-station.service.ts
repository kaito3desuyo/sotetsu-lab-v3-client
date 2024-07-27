import { inject, Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import { forkJoin, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TripService } from 'src/app/libs/trip/usecase/trip.service';
import {
    TimetableStationStateQuery,
    TimetableStationStateStore,
} from '../../timetable-station/states/timetable-station.state';

@Injectable()
export class TimetableStationService {
    readonly #stationService = inject(StationService);
    readonly #tripService = inject(TripService);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #tripClassService = inject(TripClassService);
    readonly #operationService = inject(OperationService);
    readonly #operationSightingService = inject(OperationSightingService);
    readonly #timetableStationStateStore = inject(TimetableStationStateStore);
    readonly #timetableStationStateQuery = inject(TimetableStationStateQuery);

    fetchTrips(): Observable<void> {
        const stationId = this.#timetableStationStateQuery.stationId;
        const calendarId = this.#timetableStationStateQuery.calendarId;
        const tripDirection = this.#timetableStationStateQuery.tripDirection;

        const qb = new RequestQueryBuilder()
            .setJoin([{ field: 'times' }, { field: 'tripOperationLists' }])
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

        return this.#tripService.findMany(qb).pipe(
            tap((data: TripDetailsDto[]) => {
                this.#timetableStationStateStore.setTrips(data);
            }),
            map(() => undefined)
        );
    }

    fetchTripBlocks(): Observable<void> {
        const tripBlockIds = this.#timetableStationStateQuery.trips.map(
            (o) => o.tripBlockId
        );

        const qb = new RequestQueryBuilder().setJoin([
            { field: 'trips' },
            { field: 'trips.times' },
        ]);

        return forkJoin(
            tripBlockIds.map((id) => this.#tripBlockService.findOne(id, qb))
        ).pipe(
            tap((data: TripBlockDetailsDto[]) => {
                this.#timetableStationStateStore.setTripBlocks(data);
            }),
            map(() => undefined)
        );
    }

    fetchTripClasses(): Observable<void> {
        const qb = new RequestQueryBuilder();

        return this.#tripClassService.findMany(qb).pipe(
            tap((data: TripClassDetailsDto[]) => {
                this.#timetableStationStateStore.setTripClasses(data);
            }),
            map(() => undefined)
        );
    }

    fetchStations(): Observable<void> {
        const qb = new RequestQueryBuilder();

        return this.#stationService.findMany(qb).pipe(
            tap((data: StationDetailsDto[]) => {
                this.#timetableStationStateStore.setStations(data);
            }),
            map(() => undefined)
        );
    }

    fetchOperations(): Observable<void> {
        const calendarId = this.#timetableStationStateQuery.calendarId;

        const qb = new RequestQueryBuilder().setFilter([
            {
                field: 'calendarId',
                operator: CondOperator.EQUALS,
                value: calendarId, // this.todaysCalendarListStateQuery.todaysCalendarId,
            },
            {
                field: 'operationNumber',
                operator: CondOperator.NOT_EQUALS,
                value: '100',
            },
        ]);

        return this.#operationService.findMany(qb).pipe(
            tap((data: OperationDetailsDto[]) => {
                this.#timetableStationStateStore.setOperations(data);
            }),
            map(() => undefined)
        );
    }

    fetchOperationSightingTimeCrossSections(): Observable<void> {
        const operationIds = this.#timetableStationStateQuery.operationIds;
        const operations = this.#timetableStationStateQuery.operations.filter(
            (o) => operationIds.includes(o.operationId)
        );

        return forkJoin(
            operations.map(({ operationNumber }) =>
                this.#operationSightingService.findOneTimeCrossSectionFromOperationNumber(
                    { operationNumber }
                )
            )
        ).pipe(
            tap((data) => {
                this.#timetableStationStateStore.setOperationSightingTimeCrossSections(
                    data
                );
            }),
            map(() => undefined)
        );
    }
}
