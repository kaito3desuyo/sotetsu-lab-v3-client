import { inject, Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import { forkJoin, Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
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
    readonly #operationService = inject(OperationService);
    readonly #stationService = inject(StationService);
    readonly #tripClassService = inject(TripClassService);
    readonly #operationTableStateStore = inject(OperationTableStateStore);
    readonly #operationTableStateQuery = inject(OperationTableStateQuery);

    fetchOperationTrips(): Observable<void> {
        const calendarId = this.#operationTableStateQuery.calendarId;
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
            });

        return this.#operationService.findMany(qb).pipe(
            switchMap((operations: OperationDetailsDto[]) =>
                forkJoin(
                    operations.map((operation) =>
                        this.#operationService.findOneWithTrips(
                            operation.operationId,
                            new RequestQueryBuilder()
                        )
                    )
                )
            ),
            tap((operationTrips) => {
                this.#operationTableStateStore.setOperationTrips(
                    operationTrips
                );
            }),
            map(() => undefined)
        );
    }

    fetchStations(): Observable<void> {
        const qb = new RequestQueryBuilder();
        return this.#stationService.findMany(qb).pipe(
            tap((stations: StationDetailsDto[]) =>
                this.#operationTableStateStore.setStations(stations)
            ),
            map(() => undefined)
        );
    }

    fetchTripClass(): Observable<void> {
        const qb = new RequestQueryBuilder();
        return this.#tripClassService.findMany(qb).pipe(
            tap((tripClasses: TripClassDetailsDto[]) =>
                this.#operationTableStateStore.setTripClasses(tripClasses)
            ),
            map(() => undefined)
        );
    }
}
