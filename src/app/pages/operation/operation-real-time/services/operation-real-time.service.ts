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
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { agenciesInThroughServiceOrder } from 'src/app/shared/agencies-in-through-service-order.util';
import { OperationRealTimeStore } from '../stores/operation-real-time.store';

/** 相鉄の運行系統（路線と駅はここから取る） */
const SERVICE_ID = '8d9d2a20-48ad-438b-83a4-ba8727b4708c';

@Injectable()
export class OperationRealTimeService {
    readonly #serviceService = inject(ServiceService);
    readonly #tripClassService = inject(TripClassService);
    readonly #calendarService = inject(CalendarService);
    readonly #operationService = inject(OperationService);
    readonly #formationService = inject(FormationService);
    readonly #operationSightingService = inject(OperationSightingService);
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);

    fetchRoutes(): Observable<void> {
        return this.#serviceService
            .findOneWithRoutes({
                serviceId: SERVICE_ID,
            })
            .pipe(
                tap((data) => {
                    OperationRealTimeStore.setRoutes(data.routes);
                    OperationRealTimeStore.setAgencyOrder(
                        agenciesInThroughServiceOrder(
                            this.#agencyListStateQuery.agencies,
                            this.#routeStationListStateQuery.routeStations,
                        ).map((agency) => agency.agencyId),
                    );
                }),
                map(() => undefined),
            );
    }

    /**
     * 駅は「駅 ID → 駅名」の引き当てにしか使わない。路線ごとに 21 本取って重複を消していたのを、
     * 同じ運行系統の駅一覧 1 本にする（2026-10-05 実測で 249 駅・駅名とも一致）。
     */
    fetchStations(): Observable<void> {
        return this.#serviceService
            .findOneWithStations({ serviceId: SERVICE_ID })
            .pipe(
                tap((data) => {
                    OperationRealTimeStore.setStations(data.stations);
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

    fetchOperationGroups(params?: { forceReload?: boolean }): Observable<void> {
        return this.#operationService.findManyGroups(params).pipe(
            tap((data) => {
                OperationRealTimeStore.setOperationGroups(data);
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

    /** 運用番号ごとの時刻断面を 1 回で取る（以前は運用ごとに 1 本ずつ、100 本余り引いていた）。 */
    fetchOperationSightingTimeCrossSections(params?: {
        forceReload?: boolean;
    }): Observable<void> {
        const operationNumbers = OperationRealTimeStore.operations
            .map((o) => o.operationNumber)
            .filter((o) => o !== '100');

        if (!operationNumbers.length) {
            return of(undefined);
        }

        return this.#operationSightingService
            .findManyTimeCrossSectionsByOperationNumbers({
                operationNumbers,
                forceReload: params?.forceReload,
            })
            .pipe(
                tap((data) => {
                    for (const [
                        operationNumber,
                        crossSection,
                    ] of Object.entries(data)) {
                        OperationRealTimeStore.setOperationSightingTimeCrossSection(
                            operationNumber,
                            crossSection,
                        );
                    }
                }),
                map(() => undefined),
            );
    }

    /** 編成番号ごとの時刻断面を 1 回で取る（以前は編成ごとに 1 本ずつ引いていた）。 */
    fetchFormationSightingTimeCrossSections(params?: {
        forceReload?: boolean;
    }): Observable<void> {
        const formationNumbers = OperationRealTimeStore.formations.map(
            (o) => o.formationNumber,
        );

        if (!formationNumbers.length) {
            return of(undefined);
        }

        return this.#operationSightingService
            .findManyTimeCrossSectionsByFormationNumbers({
                formationNumbers,
                forceReload: params?.forceReload,
            })
            .pipe(
                tap((data) => {
                    for (const [
                        formationNumber,
                        crossSection,
                    ] of Object.entries(data)) {
                        OperationRealTimeStore.setFormationSightingTimeCrossSection(
                            formationNumber,
                            crossSection,
                        );
                    }
                }),
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

    /** 運用ごとの現在位置を 1 回で取る（以前は運用ごとに 1 本ずつ引いていた）。 */
    fetchCurrentPositions(params?: {
        forceReload?: boolean;
    }): Observable<void> {
        return this.#fetchCurrentPositionsOf(
            OperationRealTimeStore.operations,
            params?.forceReload,
        );
    }

    fetchCurrentPositionThatShouldUpdate(): Observable<void> {
        return this.#fetchCurrentPositionsOf(
            OperationRealTimeStore.currentPositionsThatShouldUpdate.map(
                ({ operation }) => operation,
            ),
            true,
        );
    }

    #fetchCurrentPositionsOf(
        operations: Pick<
            OperationDetailsDto,
            'operationId' | 'operationNumber'
        >[],
        forceReload?: boolean,
    ): Observable<void> {
        if (!operations.length) {
            return of(undefined);
        }

        const numberById = new Map(
            operations.map((o) => [o.operationId, o.operationNumber]),
        );

        return this.#operationService
            .findManyWithCurrentPosition({
                operationIds: [...numberById.keys()],
                forceReload,
            })
            .pipe(
                tap((data) => {
                    for (const currentPosition of data) {
                        const operationNumber = numberById.get(
                            currentPosition.operation?.operationId,
                        );
                        if (operationNumber !== undefined) {
                            OperationRealTimeStore.setCurrentPosition(
                                operationNumber,
                                currentPosition,
                            );
                        }
                    }
                }),
                map(() => undefined),
            );
    }
}
