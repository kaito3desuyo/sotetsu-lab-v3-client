import { Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import dayjs from 'dayjs';
import { forkJoin, Observable, of } from 'rxjs';
import { map, mergeMap, take, tap } from 'rxjs/operators';
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

@Injectable()
export class OperationPastTimeService {
    constructor(
        private readonly calendarService: CalendarService,
        private readonly formationService: FormationService,
        private readonly operationSightingService: OperationSightingService,
        private readonly operationPastTimeStateStore: OperationPastTimeStateStore,
        private readonly operationPastTimeStateQuery: OperationPastTimeStateQuery
    ) {}

    // v2

    fetchCalendarByDate(): Observable<void> {
        const referenceDate = this.operationPastTimeStateQuery.referenceDate;
        const days = this.operationPastTimeStateQuery.days;

        if (!referenceDate || !days) {
            this.operationPastTimeStateStore.setCalendars([]);
            return of(null);
        }

        const qb = new RequestQueryBuilder();
        return this.operationPastTimeStateQuery.selectDates().pipe(
            take(1),
            mergeMap((dates) => {
                return forkJoin(
                    dates.map((date) =>
                        this.calendarService
                            .findManyBySpecificDate(qb, { date })
                            .pipe(
                                map((calendars: CalendarDetailsDto[]) => {
                                    return {
                                        date,
                                        calendar: calendars[0],
                                    };
                                })
                            )
                    )
                );
            }),
            tap((calendars) => {
                this.operationPastTimeStateStore.setCalendars(calendars);
            }),
            map(() => undefined)
        );
    }

    fetchFormationsV2(): Observable<void> {
        const referenceDate = this.operationPastTimeStateQuery.referenceDate;
        const days = this.operationPastTimeStateQuery.days;

        if (!referenceDate || !days) {
            this.operationPastTimeStateStore.setFormations([]);
            return of(null);
        }

        const format = 'YYYY-MM-DD';
        const refDate = dayjs(referenceDate, format);
        const start = refDate.format(format);
        const end = refDate.add(days - 1, 'days').format(format);
        const qb = new RequestQueryBuilder();

        return this.formationService
            .findManyBySpecificPeriod(qb, {
                startDate: start,
                endDate: end,
            })
            .pipe(
                tap((formations: FormationDetailsDto[]) => {
                    this.operationPastTimeStateStore.setFormations(formations);
                }),
                map(() => undefined)
            );
    }

    fetchOperationSightingsV2(): Observable<void> {
        const referenceDate = this.operationPastTimeStateQuery.referenceDate;
        const days = this.operationPastTimeStateQuery.days;

        if (!referenceDate || !days) {
            // this.operationPastTimeStateStore.setFormations([]);
            return of(null);
        }

        const start = dayjs(referenceDate, 'YYYY-MM-DD')
            .hour(4)
            .minute(0)
            .second(0)
            .millisecond(0)
            .toISOString();
        const end = dayjs(referenceDate, 'YYYY-MM-DD')
            .hour(4)
            .minute(0)
            .second(0)
            .millisecond(0)
            .add(days, 'days')
            .toISOString();

        const qb = new RequestQueryBuilder()
            .setFilter([
                {
                    field: 'sightingTime',
                    operator: CondOperator.BETWEEN,
                    value: [start, end],
                },
            ])
            .setJoin([{ field: 'operation' }])
            .sortBy([{ field: 'sightingTime', order: 'ASC' }]);

        return this.operationSightingService.findMany(qb).pipe(
            tap((sightings: OperationSightingDetailsDto[]) => {
                this.operationPastTimeStateStore.setOperationSightings(
                    sightings
                );
            }),
            map(() => undefined)
        );
    }
}
