import { inject, Injectable } from '@angular/core';
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

        return this.#operationService.findManyByCalendarId({ calendarId }).pipe(
            map((operations) =>
                operations.filter((o) => o.operationNumber !== '100'),
            ),
            switchMap((operations: OperationDetailsDto[]) =>
                forkJoin(
                    operations.map((operation) =>
                        this.#operationService.findOneWithTrips_V3({
                            operationId: operation.operationId,
                        }),
                    ),
                ),
            ),
            tap((operationTrips) => {
                this.#operationTableStateStore.setOperationTrips(operationTrips);
            }),
            map(() => undefined),
        );
    }

    fetchStations(): Observable<void> {
        return this.#stationService.findMany_V3({}).pipe(
            tap((stations: StationDetailsDto[]) =>
                this.#operationTableStateStore.setStations(stations),
            ),
            map(() => undefined),
        );
    }

    fetchTripClass(): Observable<void> {
        return this.#tripClassService.findMany_V3({}).pipe(
            tap((tripClasses: TripClassDetailsDto[]) =>
                this.#operationTableStateStore.setTripClasses(tripClasses),
            ),
            map(() => undefined),
        );
    }
}
