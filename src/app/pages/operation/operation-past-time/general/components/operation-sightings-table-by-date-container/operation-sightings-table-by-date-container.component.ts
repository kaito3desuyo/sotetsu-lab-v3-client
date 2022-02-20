import { Component } from '@angular/core';
import dayjs from 'dayjs';
import { combineLatest, forkJoin, Observable, of } from 'rxjs';
import { map, mergeMap, take } from 'rxjs/operators';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { OperationPastTimeStateQuery } from '../../../states/operation-past-time.state';
import { OperationPastTimeService } from '../../services/operation-past-time.service';

@Component({
    selector: 'app-operation-sightings-table-by-date-container',
    templateUrl: './operation-sightings-table-by-date-container.component.html',
    styleUrls: ['./operation-sightings-table-by-date-container.component.scss'],
})
export class OperationSightingsTableByDateContainerComponent {
    formations$ = this.operationPastTimeStateQuery.formations$;
    operationSightings$: Observable<IOperationSighting[]>;
    readonly calendars$ = combineLatest([
        this.operationPastTimeStateQuery.referenceDate$,
        this.operationPastTimeStateQuery.days$,
    ]).pipe(
        map(([referenceDate, days]) => {
            if (!referenceDate || !days) return [];
            const dates = [];
            const base = dayjs(referenceDate, 'YYYY-MM-DD');
            for (let i = 0; i < days; i++) {
                const date = base.add(i, 'days');
                dates.push(date.format('YYYY-MM-DD'));
            }
            return dates;
        }),
        mergeMap((dates) => {
            if (!dates.length) return of([]);
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

    constructor(
        private operationPastTimeService: OperationPastTimeService,
        private readonly calendarListStateQuery: CalendarListStateQuery,
        private readonly operationPastTimeStateQuery: OperationPastTimeStateQuery
    ) {
        this.operationSightings$ =
            this.operationPastTimeService.operationSightings$;
    }
}
