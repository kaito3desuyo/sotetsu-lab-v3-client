import { inject, Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import { forkJoin, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { TodaysFormationListStateQuery } from 'src/app/global-states/todays-formation-list.state';
import { TodaysOperationListStateQuery } from 'src/app/global-states/todays-operation-list.state';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import {
    OperationRealTimeStateQuery,
    OperationRealTimeStateStore,
} from '../states/operation-real-time.state';

@Injectable()
export class OperationRealTimeService {
    readonly #operationService = inject(OperationService);
    readonly #operationSightingService = inject(OperationSightingService);
    readonly #tripClassService = inject(TripClassService);
    readonly #todaysOperationsListStateQuery = inject(
        TodaysOperationListStateQuery
    );
    readonly #todaysFormationListStateQuery = inject(
        TodaysFormationListStateQuery
    );
    readonly #operationRealTimeStateStore = inject(OperationRealTimeStateStore);
    readonly #operationRealTimeStateQuery = inject(OperationRealTimeStateQuery);

    fetchOperationSightingTimeCrossSections(): Observable<void> {
        const operations =
            this.#todaysOperationsListStateQuery.todaysOperations;

        return forkJoin(
            operations.map(({ operationNumber }) =>
                this.#operationSightingService.findOneTimeCrossSectionFromOperationNumber(
                    { operationNumber }
                )
            )
        ).pipe(
            tap((data) => {
                const formations =
                    this.#todaysFormationListStateQuery.todaysFormations;

                this.#operationRealTimeStateStore.setOperationSightingTimeCrossSections(
                    data.map((o) => ({
                        ...o,
                        expectedSighting: {
                            ...o.expectedSighting,
                            formation: {
                                ...o.expectedSighting?.formation,
                                ...formations.find(
                                    ({ formationNumber }) =>
                                        formationNumber ===
                                        o.expectedSighting?.formation
                                            ?.formationNumber
                                ),
                            },
                        },
                    }))
                );
            }),
            map(() => undefined)
        );
    }

    fetchFormationSightingTimeCrossSections(): Observable<void> {
        const formations = this.#todaysFormationListStateQuery.todaysFormations;

        return forkJoin(
            formations.map(({ formationNumber }) =>
                this.#operationSightingService.findOneTimeCrossSectionFromFormationNumber(
                    { formationNumber }
                )
            )
        ).pipe(
            tap((data) => {
                const operations =
                    this.#todaysOperationsListStateQuery.todaysOperations;

                this.#operationRealTimeStateStore.setFormationSightingTimeCrossSections(
                    data.map((o) => ({
                        ...o,
                        expectedSighting: {
                            ...o.expectedSighting,
                            operation: {
                                ...o.expectedSighting?.operation,
                                ...operations.find(
                                    ({ operationNumber }) =>
                                        operationNumber ===
                                        o.expectedSighting?.operation
                                            ?.operationNumber
                                ),
                            },
                        },
                    }))
                );
            }),
            map(() => undefined)
        );
    }

    fetchOperationCurrentPosition(): Observable<void> {
        const qb = new RequestQueryBuilder();

        const operations =
            this.#todaysOperationsListStateQuery.todaysOperations;
        const currentPositions =
            this.#operationRealTimeStateQuery.currentPositions;
        const currentPositionsThatShouldUpdate =
            this.#operationRealTimeStateQuery.currentPositionsThatShouldUpdate;

        const updateTargetOperations = operations.filter(({ operationId }) => {
            if (!currentPositions.length) {
                return true;
            }

            return currentPositionsThatShouldUpdate
                .map(({ operation }) => operation.operationId)
                .includes(operationId);
        });

        if (!updateTargetOperations.length) {
            return of(undefined);
        }

        return forkJoin(
            updateTargetOperations.map((o) =>
                this.#operationService.findOneWithCurrentPosition(
                    o.operationId,
                    qb
                )
            )
        ).pipe(
            tap((data) => {
                this.#operationRealTimeStateStore.updateCurrentPositions(data);
            }),
            map(() => undefined)
        );
    }

    fetchTripClassesV2(): Observable<void> {
        const qb = new RequestQueryBuilder()
            .setJoin([{ field: 'service' }])
            .setFilter([
                {
                    field: 'service.serviceName',
                    operator: CondOperator.EQUALS,
                    value: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
                },
            ]);

        return this.#tripClassService.findMany(qb).pipe(
            tap((tripClasses: TripClassDetailsDto[]) => {
                this.#operationRealTimeStateStore.setTripClasses(tripClasses);
            }),
            map(() => undefined)
        );
    }
}
