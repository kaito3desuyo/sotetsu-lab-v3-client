import { inject, Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import {
    format,
    getHours,
    setHours,
    setMilliseconds,
    setMinutes,
    setSeconds,
    subDays,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import dayjs from 'dayjs';
import { flow } from 'es-toolkit';
import { forkJoin, from, Observable, of } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';
import { TodaysFormationListStateQuery } from 'src/app/global-states/todays-formation-list.state';
import { TodaysOperationListStateQuery } from 'src/app/global-states/todays-operation-list.state';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { RouteService } from 'src/app/libs/route/usecase/route.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import {
    OperationRealTimeStateQuery,
    OperationRealTimeStateStore,
} from '../states/operation-real-time.state';
import { OperationRealTimeStore } from '../stores/operation-real-time.store';

@Injectable()
export class OperationRealTimeService {
    readonly #serviceService = inject(ServiceService);
    readonly #routeService = inject(RouteService);
    readonly #tripClassService = inject(TripClassService);
    readonly #calendarService = inject(CalendarService);
    readonly #operationService = inject(OperationService);
    readonly #formationService = inject(FormationService);
    readonly #operationSightingService = inject(OperationSightingService);
    readonly #todaysOperationsListStateQuery = inject(
        TodaysOperationListStateQuery,
    );
    readonly #todaysFormationListStateQuery = inject(
        TodaysFormationListStateQuery,
    );
    readonly #operationRealTimeStateStore = inject(OperationRealTimeStateStore);
    readonly #operationRealTimeStateQuery = inject(OperationRealTimeStateQuery);

    fetchOperationSightingTimeCrossSections(): Observable<void> {
        const operations =
            this.#todaysOperationsListStateQuery.todaysOperations;

        return forkJoin(
            operations.map(({ operationNumber }) =>
                this.#operationSightingService.findOneTimeCrossSectionFromOperationNumber(
                    { operationNumber },
                ),
            ),
        ).pipe(
            tap((data) => {
                const formations =
                    this.#todaysFormationListStateQuery.todaysFormations;

                this.#operationRealTimeStateStore.setOperationSightingTimeCrossSections(
                    data.map((o) => ({
                        ...o,
                        expectedSighting:
                            o.expectedSighting !== null
                                ? {
                                      ...o.expectedSighting,
                                      formation: {
                                          ...o.expectedSighting?.formation,
                                          ...formations.find(
                                              ({ formationNumber }) =>
                                                  formationNumber ===
                                                  o.expectedSighting?.formation
                                                      ?.formationNumber,
                                          ),
                                      },
                                  }
                                : null,
                    })),
                );
            }),
            map(() => undefined),
        );
    }

    fetchFormationSightingTimeCrossSections(): Observable<void> {
        const formations = this.#todaysFormationListStateQuery.todaysFormations;

        return forkJoin(
            formations.map(({ formationNumber }) =>
                this.#operationSightingService.findOneTimeCrossSectionFromFormationNumber(
                    { formationNumber },
                ),
            ),
        ).pipe(
            tap((data) => {
                const operations =
                    this.#todaysOperationsListStateQuery.todaysOperations;

                this.#operationRealTimeStateStore.setFormationSightingTimeCrossSections(
                    data.map((o) => ({
                        ...o,
                        expectedSighting:
                            o.expectedSighting !== null
                                ? {
                                      ...o.expectedSighting,
                                      operation: {
                                          ...o.expectedSighting?.operation,
                                          ...operations.find(
                                              ({ operationNumber }) =>
                                                  operationNumber ===
                                                  o.expectedSighting?.operation
                                                      ?.operationNumber,
                                          ),
                                      },
                                  }
                                : null,
                    })),
                );
            }),
            map(() => undefined),
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
                    qb,
                ),
            ),
        ).pipe(
            tap((data) => {
                this.#operationRealTimeStateStore.updateCurrentPositions(data);
            }),
            map(() => undefined),
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
            map(() => undefined),
        );
    }

    fetchOperationSightingHistories(): Observable<void> {
        const operations =
            this.#todaysOperationsListStateQuery.todaysOperations;
        const date = dayjs().subtract(dayjs().hour() < 4 ? 1 : 0, 'days');
        const start = date.hour(4).minute(0).second(0).millisecond(0);
        const end = start.add(1, 'days');

        const qb = RequestQueryBuilder.create()
            .setJoin([
                {
                    field: 'operation',
                },
                {
                    field: 'formation',
                },
            ])
            .setFilter([
                {
                    field: 'operationId',
                    operator: CondOperator.IN,
                    value: operations.map((o) => o.operationId),
                },
                {
                    field: 'sightingTime',
                    operator: CondOperator.BETWEEN,
                    value: [start.toISOString(), end.toISOString()],
                },
            ])
            .sortBy([
                { field: 'sightingTime', order: 'DESC' },
                { field: 'updatedAt', order: 'DESC' },
            ]);

        return this.#operationSightingService.findMany(qb).pipe(
            tap((data: OperationSightingDetailsDto[]) => {
                this.#operationRealTimeStateStore.setOperationSightingHistories(
                    data,
                );
            }),
            map(() => undefined),
        );
    }

    fetchFormationSightingHistories(): Observable<void> {
        const formations = this.#todaysFormationListStateQuery.todaysFormations;
        const date = dayjs().subtract(dayjs().hour() < 4 ? 1 : 0, 'days');
        const start = date.hour(4).minute(0).second(0).millisecond(0);
        const end = start.add(1, 'days');

        const qb = RequestQueryBuilder.create()
            .setJoin([
                {
                    field: 'operation',
                },
                {
                    field: 'formation',
                },
            ])
            .setFilter([
                {
                    field: 'formationId',
                    operator: CondOperator.IN,
                    value: formations.map((o) => o.formationId),
                },
                {
                    field: 'sightingTime',
                    operator: CondOperator.BETWEEN,
                    value: [start.toISOString(), end.toISOString()],
                },
            ])
            .sortBy([
                { field: 'sightingTime', order: 'DESC' },
                { field: 'updatedAt', order: 'DESC' },
            ]);

        return this.#operationSightingService.findMany(qb).pipe(
            tap((data: OperationSightingDetailsDto[]) => {
                this.#operationRealTimeStateStore.setFormationSightingHistories(
                    data,
                );
            }),
            map(() => undefined),
        );
    }

    // v3

    fetchRoutes_V3(): Observable<void> {
        return this.#serviceService
            .findOneWithRoutes_V3({
                serviceId: '8d9d2a20-48ad-438b-83a4-ba8727b4708c',
            })
            .pipe(
                tap((data) => {
                    OperationRealTimeStore.setRoutes(data.routes);
                }),
                map(() => undefined),
            );
    }

    fetchStations_V3(): Observable<void> {
        const routes = OperationRealTimeStore.routes;

        return forkJoin(
            routes.map(({ routeId }) =>
                this.#routeService.findOneWithStations_V3({ routeId }),
            ),
        ).pipe(
            map((data) =>
                data
                    .flatMap((d) => d.stations)
                    .filter(
                        (s, i, arr) =>
                            arr.findIndex(
                                ({ stationId }) => stationId === s.stationId,
                            ) === i,
                    ),
            ),
            tap((data) => {
                OperationRealTimeStore.setStations(data);
            }),
            map(() => undefined),
        );
    }

    fetchTripClasses_V3(): Observable<void> {
        return this.#tripClassService.findMany_V3({}).pipe(
            tap((data) => {
                OperationRealTimeStore.setTripClasses(data);
            }),
            map(() => undefined),
        );
    }

    fetchCalendar_V3(): Observable<void> {
        const generateBaseDate: (unixtime: number) => string = flow(
            (unixtime: number) => toZonedTime(unixtime, 'Asia/Tokyo'),
            (date: Date) => (getHours(date) < 4 ? subDays(date, 1) : date),
            (date: Date) => setHours(date, 4),
            (date: Date) => setMinutes(date, 0),
            (date: Date) => setSeconds(date, 0),
            (date: Date) => setMilliseconds(date, 0),
            (date: Date) => format(date, 'yyyy-MM-dd'),
        );
        const date = generateBaseDate(Date.now());

        return this.#calendarService
            .findOneBySpecificDate({
                date,
            })
            .pipe(
                tap((data) => {
                    OperationRealTimeStore.setCalendar(data);
                }),
                map(() => undefined),
            );
    }

    fetchOperations_V3(): Observable<void> {
        const calendarId = OperationRealTimeStore.calendar.calendarId;

        return this.#operationService
            .findManyByCalendarId({
                calendarId,
            })
            .pipe(
                tap((data) => {
                    OperationRealTimeStore.setOperations(data);
                }),
                map(() => undefined),
            );
    }

    fetchFormations_V3(): Observable<void> {
        const generateBaseDate: (unixtime: number) => string = flow(
            (unixtime: number) => toZonedTime(unixtime, 'Asia/Tokyo'),
            (date: Date) => (getHours(date) < 4 ? subDays(date, 1) : date),
            (date: Date) => setHours(date, 4),
            (date: Date) => setMinutes(date, 0),
            (date: Date) => setSeconds(date, 0),
            (date: Date) => setMilliseconds(date, 0),
            (date: Date) => format(date, 'yyyy-MM-dd'),
        );
        const date = generateBaseDate(Date.now());

        return this.#formationService
            .findManyBySpecificPeriod_V3({
                startDate: date,
                endDate: date,
            })
            .pipe(
                tap((data) => {
                    OperationRealTimeStore.setFormations(data);
                }),
                map(() => undefined),
            );
    }

    fetchOperationSightingTimeCrossSections_V3(params?: {
        forceReload?: boolean;
    }): Observable<void> {
        const operations = OperationRealTimeStore.operations;

        return from(operations).pipe(
            mergeMap(
                ({ operationNumber }) =>
                    this.#operationSightingService
                        .findOneTimeCrossSectionByOperationNumber_V3({
                            operationNumber,
                            forceReload: params?.forceReload,
                        })
                        .pipe(
                            tap((data) => {
                                OperationRealTimeStore.setOperationSightingTimeCrossSection(
                                    operationNumber,
                                    data,
                                );
                            }),
                        ),
                5,
            ),
            map(() => undefined),
        );
    }

    fetchFormationSightingTimeCrossSections_V3(params?: {
        forceReload?: boolean;
    }): Observable<void> {
        const formations = OperationRealTimeStore.formations;

        return from(formations).pipe(
            mergeMap(
                ({ formationNumber }) =>
                    this.#operationSightingService
                        .findOneTimeCrossSectionByFormationNumber_V3({
                            formationNumber,
                            forceReload: params?.forceReload,
                        })
                        .pipe(
                            tap((data) => {
                                OperationRealTimeStore.setFormationSightingTimeCrossSection(
                                    formationNumber,
                                    data,
                                );
                            }),
                        ),
                5,
            ),
            map(() => undefined),
        );
    }

    fetchSightingHistories_V3(params?: {
        forceReload?: boolean;
    }): Observable<void> {
        const operations = OperationRealTimeStore.operations;
        const formations = OperationRealTimeStore.formations;

        const generateBaseDate: (unixtime: number) => string = flow(
            (unixtime: number) => toZonedTime(unixtime, 'Asia/Tokyo'),
            (date: Date) => (getHours(date) < 4 ? subDays(date, 1) : date),
            (date: Date) => setHours(date, 4),
            (date: Date) => setMinutes(date, 0),
            (date: Date) => setSeconds(date, 0),
            (date: Date) => setMilliseconds(date, 0),
            (date: Date) => format(date, 'yyyy-MM-dd'),
        );

        const date = generateBaseDate(Date.now());

        return this.#operationSightingService
            .findManyBySpecificPeriod({
                from: date,
                to: date,
                // includeInvalidated: true,
                forceReload: params?.forceReload,
            })
            .pipe(
                tap((data) => {
                    for (const operation of operations) {
                        const filtered = data.filter(
                            (o) => o.operationId === operation.operationId,
                        );
                        OperationRealTimeStore.setOperationSightingHistory(
                            operation.operationNumber,
                            filtered,
                        );
                    }

                    for (const formation of formations) {
                        const filtered = data.filter(
                            (o) => o.formationId === formation.formationId,
                        );
                        OperationRealTimeStore.setFormationSightingHistory(
                            formation.formationNumber,
                            filtered,
                        );
                    }
                }),
                map(() => undefined),
            );
    }

    fetchCurrentPositions_V3(params?: {
        forceReload?: boolean;
    }): Observable<void> {
        const operations = OperationRealTimeStore.operations;

        return from(operations).pipe(
            mergeMap(
                ({ operationId, operationNumber }) =>
                    this.#operationService
                        .findOneWithCurrentPosition_V3({
                            operationId,
                            forceReload: params?.forceReload,
                        })
                        .pipe(
                            tap((data) => {
                                OperationRealTimeStore.setCurrentPosition(
                                    operationNumber,
                                    data,
                                );
                            }),
                        ),
                5,
            ),
            map(() => undefined),
        );
    }

    fetchCurrentPositionThatShouldUpdate_V3(): Observable<void> {
        const currentPositions =
            OperationRealTimeStore.currentPositionsThatShouldUpdate;

        if (!currentPositions.length) {
            return of(undefined);
        }

        return from(
            currentPositions.map(({ operation }) => ({
                operationId: operation.operationId,
                operationNumber: operation.operationNumber,
            })),
        ).pipe(
            mergeMap(
                ({ operationId, operationNumber }) =>
                    this.#operationService
                        .findOneWithCurrentPosition_V3({
                            operationId,
                            forceReload: true,
                        })
                        .pipe(
                            tap((data) => {
                                OperationRealTimeStore.setCurrentPosition(
                                    operationNumber,
                                    data,
                                );
                            }),
                        ),
                5,
            ),
            map(() => undefined),
        );
    }
}
