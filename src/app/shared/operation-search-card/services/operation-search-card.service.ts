import { Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import { forkJoin, Observable, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import {
    OperationSearchCardStateQuery,
    OperationSearchCardStateStore,
} from '../states/operation-search-card.state';

@Injectable()
export class OperationSearchCardService {
    private readonly _searchOpeartionTableEvent$ = new Subject<
        CalendarDetailsDto['calendarId']
    >();
    private readonly _searchOpeartionRouteDiagramEvent$ = new Subject<
        OperationDetailsDto['operationId']
    >();

    constructor(
        private readonly operationService: OperationService,
        private readonly operationSearchCardStateStore: OperationSearchCardStateStore,
        private readonly operationSearchCardStateQuery: OperationSearchCardStateQuery
    ) {}

    emitSearchOperationTableEvent(
        calendarId: CalendarDetailsDto['calendarId']
    ): void {
        this._searchOpeartionTableEvent$.next(calendarId);
    }

    receiveSearchOperationTableEvent(): Observable<
        CalendarDetailsDto['calendarId']
    > {
        return this._searchOpeartionTableEvent$.asObservable();
    }

    emitSearchOperationRouteDiagramEvent(
        operationId: OperationDetailsDto['operationId']
    ): void {
        this._searchOpeartionRouteDiagramEvent$.next(operationId);
    }

    receiveSearchOperationRouteDiagramEvent(): Observable<
        OperationDetailsDto['operationId']
    > {
        return this._searchOpeartionRouteDiagramEvent$.asObservable();
    }

    fetchOperations(): Observable<void> {
        const calendarId = this.operationSearchCardStateQuery.calendarId;
        const qb = RequestQueryBuilder.create().setFilter([
            {
                field: 'calendarId',
                operator: CondOperator.EQUALS,
                value: calendarId,
            },
            {
                field: 'operationNumber',
                operator: CondOperator.NOT_EQUALS,
                value: '100',
            },
        ]);

        return forkJoin([
            this.operationService.findMany(qb),
            this.operationService.findAllOperationNumbers(calendarId),
        ]).pipe(
            tap(([operations, numbers]) => {
                if (!Array.isArray(operations) || !Array.isArray(numbers)) {
                    return;
                }

                const sorted = [...operations].sort(
                    (a, b) =>
                        numbers.findIndex((n) => n === a.operationNumber) -
                        numbers.findIndex((n) => n === b.operationNumber)
                );

                this.operationSearchCardStateStore.setOperations(sorted);
            }),
            map(() => undefined)
        );
    }
}
