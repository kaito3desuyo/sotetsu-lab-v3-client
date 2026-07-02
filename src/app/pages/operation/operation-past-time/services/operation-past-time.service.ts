import { inject, Injectable } from '@angular/core';
import { format } from 'date-fns';
import { forkJoin, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import {
    OperationPastTimeStateQuery,
    OperationPastTimeStateStore,
} from '../states/operation-past-time.state';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';

@Injectable()
export class OperationPastTimeService {
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);
    readonly #calendarService = inject(CalendarService);
    readonly #operationService = inject(OperationService);
    readonly #formationService = inject(FormationService);
    readonly #operationSightingService = inject(OperationSightingService);
    readonly #operationPastTimeStateStore = inject(OperationPastTimeStateStore);
    readonly #operationPastTimeStateQuery = inject(OperationPastTimeStateQuery);

    fetchCalendarByDate(): Observable<void> {
        const dates = this.#operationPastTimeStateQuery.dates;

        if (!dates.length) {
            this.#operationPastTimeStateStore.setCalendars([]);
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
                this.#operationPastTimeStateStore.setCalendars(calendars);
            }),
            map(() => undefined),
        );
    }

    fetchFormations(): Observable<void> {
        const dates = this.#operationPastTimeStateQuery.dates;

        if (!dates.length) {
            this.#operationPastTimeStateStore.setFormations([]);
            return of(undefined);
        }

        return this.#formationService
            .findManyBySpecificPeriod({
                startDate: dates[0],
                endDate: dates[dates.length - 1],
            })
            .pipe(
                tap((formations: FormationDetailsDto[]) => {
                    const agencies = this.#agencyListStateQuery.agencies;
                    this.#operationPastTimeStateStore.setFormations(
                        [...formations].sort(
                            (a, b) =>
                                agencies.findIndex(
                                    (v) => v.agencyId === a.agencyId,
                                ) -
                                agencies.findIndex(
                                    (v) => v.agencyId === b.agencyId,
                                ),
                        ),
                    );
                }),
                map(() => undefined),
            );
    }

    // v3
    fetchOperationsV3(): Observable<void> {
        const dates = this.#operationPastTimeStateQuery.dates;

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
                    this.#operationPastTimeStateStore.setOperations(operations);
                }),
                map(() => undefined),
            );
    }

    fetchOperationSightingsV3(): Observable<void> {
        const dates = this.#operationPastTimeStateQuery.dates;
        const includeInvalidated =
            this.#operationPastTimeStateQuery.includeInvalidated;

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
                    this.#operationPastTimeStateStore.setOperationSightings(
                        sightings,
                    );
                }),
                map(() => undefined),
            );
    }
}
