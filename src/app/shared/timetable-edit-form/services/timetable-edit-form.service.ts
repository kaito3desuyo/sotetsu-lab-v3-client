import { Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { CreateTripBlockDto } from 'src/app/libs/trip-block/usecase/dtos/create-trip-block.dto';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import { ETimetableEditFormMode } from '../special/enums/timetable-edit-form.enum';
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
        const mode = this.timetableEditFormStateQuery.mode;
        const isSaveTripsIndividually =
            this.timetableEditFormStateQuery.isSaveTripsIndividually;
        const qb = new RequestQueryBuilder();

        const tripBlocks: CreateTripBlockDto[] = isSaveTripsIndividually
            ? trips.map((trip) => ({ tripBlockId: undefined, trips: [trip] }))
            : [{ tripBlockId: undefined, trips }];

        switch (mode) {
            case ETimetableEditFormMode.ADD:
            case ETimetableEditFormMode.COPY:
                return this.tripBlockService
                    .createMany(qb, tripBlocks)
                    .pipe(map(() => undefined));
            default:
                return of(undefined);
        }
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
}
