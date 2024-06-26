import { Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import dayjs from 'dayjs';
import { Observable, forkJoin, of, zip } from 'rxjs';
import { filter, map, switchMap, take, tap } from 'rxjs/operators';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import {
    OperationRealTimeStateQuery,
    OperationRealTimeStateStore,
} from '../states/operation-real-time.state';

@Injectable()
export class OperationRealTimeService {
    constructor(
        private readonly agencyListStateQuery: AgencyListStateQuery,
        private readonly todaysCalendarListStateQuery: TodaysCalendarListStateQuery,
        private readonly operationRealTimeStateStore: OperationRealTimeStateStore,
        private readonly operationRealTimeStateQuery: OperationRealTimeStateQuery,
        private readonly operationService: OperationService,
        private readonly formationService: FormationService,
        private readonly operationSightingService: OperationSightingService,
        private readonly tripClassService: TripClassService
    ) {}

    // v2

    fetchOperationsV2(): Observable<void> {
        const calendarId = this.todaysCalendarListStateQuery.todaysCalendarId;
        const qb = new RequestQueryBuilder()
            .setFilter([
                {
                    field: 'calendarId',
                    operator: CondOperator.EQUALS,
                    value: this.todaysCalendarListStateQuery.todaysCalendarId,
                },
            ])
            .sortBy([{ field: 'operationNumber', order: 'ASC' }]);

        return forkJoin([
            this.operationService.findMany(qb),
            this.operationService.findAllOperationNumbers(calendarId),
        ]).pipe(
            tap(([operations, numbers]: [OperationDetailsDto[], string[]]) => {
                const sorted = [...operations].sort(
                    (a, b) =>
                        numbers.findIndex((n) => n === a.operationNumber) -
                        numbers.findIndex((n) => n === b.operationNumber)
                );

                this.operationRealTimeStateStore.setOperations(sorted);
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
                tap((formations: FormationDetailsDto[]) => {
                    const agencies = this.agencyListStateQuery.agencies;
                    this.operationRealTimeStateStore.setFormations(
                        [...formations].sort(
                            (a, b) =>
                                agencies.findIndex(
                                    (v) => v.agencyId === a.agencyId
                                ) -
                                agencies.findIndex(
                                    (v) => v.agencyId === b.agencyId
                                )
                        )
                    );
                }),
                map(() => undefined)
            );
    }

    fetchOperationSightingTimeCrossSections(): Observable<void> {
        return this.operationRealTimeStateQuery.operations$.pipe(
            take(1),
            switchMap((operations) =>
                forkJoin(
                    operations
                        .filter(
                            ({ operationNumber }) => operationNumber !== '100'
                        )
                        .map(({ operationNumber }) =>
                            this.operationSightingService.findOneTimeCrossSectionFromOperationNumber(
                                { operationNumber }
                            )
                        )
                )
            ),
            switchMap((data) =>
                forkJoin([
                    of(data),
                    this.operationRealTimeStateQuery.formations$.pipe(take(1)),
                ])
            ),
            tap(([data, formations]) => {
                this.operationRealTimeStateStore.setOperationSightingTimeCrossSections(
                    data.map((o) => ({
                        ...o,
                        expectedSighting: {
                            ...o.expectedSighting,
                            formation: {
                                ...o.expectedSighting?.formation,
                                ...formations.find(
                                    (f) =>
                                        f.formationNumber ===
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
        return this.operationRealTimeStateQuery.formations$.pipe(
            take(1),
            switchMap((formations) =>
                forkJoin(
                    formations.map(({ formationNumber }) =>
                        this.operationSightingService.findOneTimeCrossSectionFromFormationNumber(
                            { formationNumber }
                        )
                    )
                )
            ),
            switchMap((data) =>
                forkJoin([
                    of(data),
                    this.operationRealTimeStateQuery.operations$.pipe(take(1)),
                ])
            ),
            tap(([data, operations]) => {
                this.operationRealTimeStateStore.setFormationSightingTimeCrossSections(
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

        return zip(
            this.operationRealTimeStateQuery.operations$,
            this.operationRealTimeStateQuery.currentPositions$,
            this.operationRealTimeStateQuery.currentPositionsThatShouldUpdate$
        ).pipe(
            take(1),
            map(
                ([
                    operations,
                    currentPositions,
                    currentPositionsThatShouldUpdate,
                ]) =>
                    operations.filter(({ operationId }) => {
                        if (!currentPositions.length) {
                            return true;
                        }

                        return currentPositionsThatShouldUpdate
                            .map(({ operation }) => operation.operationId)
                            .includes(operationId);
                    })
            ),
            filter((operations) => !!operations.length),
            switchMap((operations) =>
                forkJoin(
                    operations.map((op) =>
                        this.operationService.findOneWithCurrentPosition(
                            op.operationId,
                            qb
                        )
                    )
                )
            ),
            tap((data) => {
                this.operationRealTimeStateStore.updateCurrentPositions(data);
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

        return this.tripClassService.findMany(qb).pipe(
            tap((tripClasses: TripClassDetailsDto[]) => {
                this.operationRealTimeStateStore.setTripClasses(tripClasses);
            }),
            map(() => undefined)
        );
    }
}
