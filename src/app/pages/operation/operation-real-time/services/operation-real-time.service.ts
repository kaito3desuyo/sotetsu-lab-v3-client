import { inject, Injectable } from '@angular/core';
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
import { flow } from 'es-toolkit';
import { forkJoin, from, Observable, of } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { RouteService } from 'src/app/libs/route/usecase/route.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
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

    fetchRoutes(): Observable<void> {
        return this.#serviceService
            .findOneWithRoutes({
                serviceId: '8d9d2a20-48ad-438b-83a4-ba8727b4708c',
            })
            .pipe(
                tap((data) => {
                    OperationRealTimeStore.setRoutes(data.routes);
                }),
                map(() => undefined),
            );
    }

    fetchStations(): Observable<void> {
        const routes = OperationRealTimeStore.routes;

        return forkJoin(
            routes.map(({ routeId }) =>
                this.#routeService.findOneWithStations({ routeId }),
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

    fetchTripClasses(): Observable<void> {
        return this.#tripClassService.findMany({}).pipe(
            tap((data) => {
                OperationRealTimeStore.setTripClasses(data);
            }),
            map(() => undefined),
        );
    }

    fetchCalendar(): Observable<void> {
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

    fetchOperations(): Observable<void> {
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

    fetchFormations(): Observable<void> {
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
            .findManyBySpecificPeriod({
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

    fetchOperationSightingTimeCrossSections(params?: {
        forceReload?: boolean;
    }): Observable<void> {
        const operations = OperationRealTimeStore.operations;

        return from(operations).pipe(
            mergeMap(
                ({ operationNumber }) =>
                    this.#operationSightingService
                        .findOneTimeCrossSectionByOperationNumber({
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

    fetchFormationSightingTimeCrossSections(params?: {
        forceReload?: boolean;
    }): Observable<void> {
        const formations = OperationRealTimeStore.formations;

        return from(formations).pipe(
            mergeMap(
                ({ formationNumber }) =>
                    this.#operationSightingService
                        .findOneTimeCrossSectionByFormationNumber({
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

    fetchSightingHistories(params?: {
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

    fetchCurrentPositions(params?: {
        forceReload?: boolean;
    }): Observable<void> {
        const operations = OperationRealTimeStore.operations;

        return from(operations).pipe(
            mergeMap(
                ({ operationId, operationNumber }) =>
                    this.#operationService
                        .findOneWithCurrentPosition({
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

    fetchCurrentPositionThatShouldUpdate(): Observable<void> {
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
                        .findOneWithCurrentPosition({
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
