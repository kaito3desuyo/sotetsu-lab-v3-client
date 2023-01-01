import { Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { CreateTripBlockDto } from 'src/app/libs/trip-block/usecase/dtos/create-trip-block.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import {
    TimetableEditFormStateQuery,
    TimetableEditFormStateStore,
} from '../states/timetable-edit-form.state';

@Injectable()
export class TimetableEditFormService {
    constructor(
        private readonly serviceService: ServiceService,
        private readonly operationService: OperationService,
        private readonly tripClassService: TripClassService,
        private readonly tripBlockService: TripBlockService,
        private readonly serviceListStateQuery: ServiceListStateQuery,
        private readonly timetableEditFormStateStore: TimetableEditFormStateStore,
        private readonly timetableEditFormStateQuery: TimetableEditFormStateQuery
    ) {}

    createTripBlocks(trips: CreateTripDto[]): Observable<void> {
        const isSaveTripsIndividually =
            this.timetableEditFormStateQuery.isSaveTripsIndividually;
        const qb = new RequestQueryBuilder();

        const tripBlocks: CreateTripBlockDto[] = isSaveTripsIndividually
            ? trips.map((trip) => ({ tripBlockId: undefined, trips: [trip] }))
            : [{ tripBlockId: undefined, trips }];

        return this.tripBlockService
            .createMany(qb, tripBlocks)
            .pipe(map(() => undefined));
    }

    fetchStations(): Observable<void> {
        const serviceId = this.serviceListStateQuery.serviceId;
        const qb = new RequestQueryBuilder()
            .setJoin([
                {
                    field: 'operatingSystems.route.routeStationLists.station.routeStationLists',
                },
                {
                    field: 'operatingSystems.route.routeStationLists.station.routeStationLists.route',
                },
                {
                    field: 'operatingSystems.route.routeStationLists.station.stops',
                },
            ])
            .sortBy([
                {
                    field: 'routeStationListsStationStops.stopName',
                    order: 'ASC',
                },
            ]);

        return this.serviceService.findOneWithStations(serviceId, qb).pipe(
            tap((data) => {
                this.timetableEditFormStateStore.setStations(data.stations);
            }),
            map(() => undefined)
        );
    }

    fetchOperations(): Observable<void> {
        const calendarId = this.timetableEditFormStateQuery.calendarId;
        const qb = RequestQueryBuilder.create()
            .setFilter([
                {
                    field: 'calendarId',
                    operator: CondOperator.EQUALS,
                    value: calendarId,
                },
                {
                    field: 'operationNumber',
                    operator: CondOperator.NOT_EQUALS,
                    value: '100',
                },
            ])
            .sortBy([{ field: 'operationNumber', order: 'ASC' }]);

        return this.operationService.findMany(qb).pipe(
            tap((operations: OperationDetailsDto[]) => {
                this.timetableEditFormStateStore.setOperations(operations);
            }),
            map(() => undefined)
        );
    }

    fetchTripClasses(): Observable<void> {
        const serviceId = this.serviceListStateQuery.serviceId;
        const qb = RequestQueryBuilder.create()
            .setFilter([
                {
                    field: 'serviceId',
                    operator: CondOperator.EQUALS,
                    value: serviceId,
                },
            ])
            .sortBy([{ field: 'sequence', order: 'ASC' }]);

        return this.tripClassService.findMany(qb).pipe(
            tap((tripClasses: TripClassDetailsDto[]) => {
                this.timetableEditFormStateStore.setTripClasses(tripClasses);
            }),
            map(() => undefined)
        );
    }

    fetchTripBlocks(): Observable<void> {
        const tripBlockId = this.timetableEditFormStateQuery.tripBlockId;
        const qb = RequestQueryBuilder.create()
            .setJoin([
                { field: 'trips' },
                { field: 'trips.times' },
                { field: 'trips.tripOperationLists' },
            ])
            .setFilter([
                {
                    field: 'id',
                    operator: CondOperator.EQUALS,
                    value: tripBlockId,
                },
            ])
            .sortBy([
                { field: 'trips.times.departureDays', order: 'ASC' },
                { field: 'trips.times.departureTime', order: 'ASC' },
            ]);

        return this.tripBlockService.findMany(qb).pipe(
            tap((tripBlocks: TripBlockDetailsDto[]) => {
                this.timetableEditFormStateStore.setTripDirection(
                    tripBlocks[0].trips[0].tripDirection as ETripDirection
                );
                this.timetableEditFormStateStore.setTripBlocks(tripBlocks);
            }),
            map(() => undefined)
        );
    }
}
