import { Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import { forkJoin, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import {
    OperationTableStateQuery,
    OperationTableStateStore,
} from '../states/operation-table.state';

@Injectable()
export class OperationTableService {
    constructor(
        private readonly operationService: OperationService,
        private readonly stationService: StationService,
        private readonly tripClassService: TripClassService,
        private readonly operationTableStateStore: OperationTableStateStore,
        private readonly operationTableStateQuery: OperationTableStateQuery
    ) {}

    // v2

    fetchOperationsByCalendarId(): Observable<void> {
        const calendarId = this.operationTableStateQuery.calendarId;
        const qb = new RequestQueryBuilder()
            .setFilter({
                field: 'calendarId',
                operator: CondOperator.EQUALS,
                value: calendarId,
            })
            .setFilter({
                field: 'operationNumber',
                operator: CondOperator.NOT_EQUALS,
                value: '100',
            })
            .sortBy({
                field: 'operationNumber',
                order: 'ASC',
            });

        return this.operationService.findMany(qb).pipe(
            tap((operations: OperationDetailsDto[]) => {
                this.operationTableStateStore.setOperations(operations);
            }),
            map(() => undefined)
        );
    }

    fetchAllOperationTrips(): Observable<void> {
        const qb = new RequestQueryBuilder();

        return forkJoin(
            this.operationTableStateQuery.operations.map((operation) =>
                this.operationService.findOneWithTrips(
                    operation.operationId,
                    qb
                )
            )
        ).pipe(
            tap((allOperationTrips) => {
                this.operationTableStateStore.setAllOperationTrips(
                    allOperationTrips
                );
            }),
            map(() => undefined)
        );
    }

    fetchStationsV2(): Observable<void> {
        const qb = new RequestQueryBuilder();
        return this.stationService.findMany(qb).pipe(
            tap((stations: StationDetailsDto[]) =>
                this.operationTableStateStore.setStations(stations)
            ),
            map(() => undefined)
        );
    }

    fetchTripClassV2(): Observable<void> {
        const qb = new RequestQueryBuilder();
        return this.tripClassService.findMany(qb).pipe(
            tap((tripClasses: TripClassDetailsDto[]) =>
                this.operationTableStateStore.setTripClasses(tripClasses)
            ),
            map(() => undefined)
        );
    }
}
