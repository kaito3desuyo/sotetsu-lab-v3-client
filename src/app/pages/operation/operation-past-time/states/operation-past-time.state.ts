import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import { isString } from 'class-validator';
import dayjs from 'dayjs';
import { groupBy } from 'lodash-es';
import { forkJoin, Observable, of } from 'rxjs';
import { map, mergeMap, take } from 'rxjs/operators';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';

type OperationPastTimeState = {
    referenceDate: string;
    days: number;
    formations: FormationDetailsDto[];
    operationSightings: OperationSightingDetailsDto[];
};

@Injectable()
export class OperationPastTimeStateStore extends Store<OperationPastTimeState> {
    constructor() {
        super(
            {
                referenceDate: null,
                days: null,
                formations: [],
                operationSightings: [],
            },
            { name: `OperationPastTime-${guid()}` }
        );
    }

    setReferenceDate(date: string): void {
        this.update({
            referenceDate: date,
        });
    }

    setDays(days: number): void {
        this.update({
            days,
        });
    }

    setFormations(formations: FormationDetailsDto[]): void {
        this.update({
            formations,
        });
    }

    setOperationSightings(sightings: OperationSightingDetailsDto[]): void {
        this.update({
            operationSightings: sightings,
        });
    }
}

@Injectable()
export class OperationPastTimeStateQuery extends Query<OperationPastTimeState> {
    readonly referenceDate$ = this.select('referenceDate');
    readonly days$ = this.select('days');
    readonly formations$ = this.select('formations');

    get referenceDate(): string {
        return this.getValue().referenceDate;
    }

    get days(): number {
        return this.getValue().days;
    }

    constructor(
        protected readonly store: OperationPastTimeStateStore,
        private readonly calendarListStateQuery: CalendarListStateQuery
    ) {
        super(store);
    }

    selectCalendarsFilteredByDates(): Observable<
        { date: string; calendar: CalendarDetailsDto }[]
    > {
        return this.select(['referenceDate', 'days']).pipe(
            map(({ referenceDate, days }) => {
                if (!referenceDate || !days) return [];
                const dates: string[] = [];
                const base = dayjs(referenceDate, 'YYYY-MM-DD');
                for (let i = 0; i < days; i++) {
                    const date = base.add(i, 'days');
                    dates.push(date.format('YYYY-MM-DD'));
                }
                return dates;
            }),
            mergeMap((dates) => {
                if (!dates.length) {
                    return of<{ date: string; calendar: CalendarDetailsDto }[]>(
                        []
                    );
                }

                return forkJoin(
                    dates.map((date) =>
                        this.calendarListStateQuery.selectByDate(date).pipe(
                            take(1),
                            map((calendar) => ({ date, calendar }))
                        )
                    )
                );
            })
        );
    }

    selectOperationSightingsGroupedByDate(): Observable<{
        [formationId: string]: {
            [date: string]: OperationSightingDetailsDto[];
        };
    }> {
        return this.select('operationSightings').pipe(
            map((sightings) => {
                const groupedByFormationId: [
                    string,
                    OperationSightingDetailsDto[]
                ][] = Object.entries(groupBy(sightings, (o) => o.formationId));

                const groupedByDate: {
                    [formationId: string]: {
                        [date: string]: OperationSightingDetailsDto[];
                    };
                } = groupedByFormationId
                    .map(([formationId, sightings]) => {
                        return [
                            formationId,
                            groupBy(sightings, (o) =>
                                dayjs(o.sightingTime)
                                    .subtract(
                                        dayjs(o.sightingTime).hour() < 4
                                            ? 1
                                            : 0,
                                        'days'
                                    )
                                    .format('YYYY-MM-DD')
                            ),
                        ];
                    })
                    .reduce((base, [formationId, sighting]) => {
                        if (!isString(formationId)) {
                            return { ...base };
                        }
                        return { ...base, [formationId]: sighting };
                    }, {});

                return groupedByDate;
            })
        );
    }
}
