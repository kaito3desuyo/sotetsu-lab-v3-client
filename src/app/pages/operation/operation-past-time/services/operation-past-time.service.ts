import { inject, Injectable } from '@angular/core';
import { format } from 'date-fns';
import { forkJoin, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { agenciesInThroughServiceOrder } from 'src/app/shared/agencies-in-through-service-order.util';
import { OperationPastTimeStore } from '../stores/operation-past-time.store';

@Injectable()
export class OperationPastTimeService {
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);
    readonly #calendarService = inject(CalendarService);
    readonly #operationService = inject(OperationService);
    readonly #formationService = inject(FormationService);
    readonly #operationSightingService = inject(OperationSightingService);

    fetchCalendarByDate(): Observable<void> {
        const dates = OperationPastTimeStore.dates;

        if (!dates.length) {
            OperationPastTimeStore.setCalendars([]);
            return of(undefined);
        }

        return forkJoin(
            dates.map((date) =>
                this.#calendarService
                    .findOneBySpecificDate({ date })
                    .pipe(map((calendar: CalendarDetailsDto) => ({ date, calendar }))),
            ),
        ).pipe(
            tap((calendars) => {
                OperationPastTimeStore.setCalendars(calendars);
            }),
            map(() => undefined),
        );
    }

    fetchFormations(): Observable<void> {
        const dates = OperationPastTimeStore.dates;

        if (!dates.length) {
            OperationPastTimeStore.setFormations([]);
            return of(undefined);
        }

        return this.#formationService
            .findManyBySpecificPeriod({
                startDate: dates[0],
                endDate: dates[dates.length - 1],
            })
            .pipe(
                tap((formations: FormationDetailsDto[]) => {
                    // 会社の順は相鉄と直通を始めた順（会社チップと同じ。agenciesInThroughServiceOrder）
                    const agencies = agenciesInThroughServiceOrder(
                        this.#agencyListStateQuery.agencies,
                        this.#routeStationListStateQuery.routeStations,
                    );
                    OperationPastTimeStore.setFormations(
                        [...formations].sort((a, b) => {
                            const agencyDiff =
                                agencies.findIndex(
                                    (v) => v.agencyId === a.agencyId,
                                ) -
                                agencies.findIndex(
                                    (v) => v.agencyId === b.agencyId,
                                );
                            if (agencyDiff !== 0) {
                                return agencyDiff;
                            }
                            // 会社内は編成番号の数値順（API 返却順のままだと
                            // 東急・相鉄の一部で番号が前後するため）。
                            return (a.formationNumber ?? '').localeCompare(
                                b.formationNumber ?? '',
                                undefined,
                                { numeric: true },
                            );
                        }),
                    );
                }),
                map(() => undefined),
            );
    }

    fetchOperationsV3(): Observable<void> {
        const dates = OperationPastTimeStore.dates;

        if (!dates.length) {
            return of(undefined);
        }

        return this.#operationService
            .findManyBySpecificPeriod({
                from: format(dates[0], 'yyyy-MM-dd'),
                to: format(dates[dates.length - 1], 'yyyy-MM-dd'),
            })
            .pipe(
                tap((operations: OperationDetailsDto[]) => {
                    OperationPastTimeStore.setOperations(operations);
                }),
                map(() => undefined),
            );
    }

    fetchOperationSightingsV3(): Observable<void> {
        const dates = OperationPastTimeStore.dates;
        const includeInvalidated = OperationPastTimeStore.includeInvalidated;

        if (!dates.length) {
            return of(undefined);
        }

        return this.#operationSightingService
            .findManyBySpecificPeriod({
                from: format(dates[0], 'yyyy-MM-dd'),
                to: format(dates[dates.length - 1], 'yyyy-MM-dd'),
                includeInvalidated: includeInvalidated ? true : undefined,
            })
            .pipe(
                tap((sightings: OperationSightingDetailsDto[]) => {
                    OperationPastTimeStore.setOperationSightings(sightings);
                }),
                map(() => undefined),
            );
    }
}
