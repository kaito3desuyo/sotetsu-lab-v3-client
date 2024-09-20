import { Injectable } from '@angular/core';
import {
    EntityState,
    EntityStore,
    QueryEntity,
    StoreConfig,
} from '@datorama/akita';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { generateOperationSortNumber } from '../core/utils/generate-operation-sort-number';
import { OperationDetailsDto } from '../libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from '../libs/operation/usecase/operation.service';
import { TodaysCalendarListStateQuery } from './todays-calendar-list.state';

interface TodaysOperationListState
    extends EntityState<OperationDetailsDto, string> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'TodaysOperationList', idKey: 'operationId' })
export class TodaysOperationListStateStore extends EntityStore<TodaysOperationListState> {
    constructor(
        private readonly operationService: OperationService,
        private readonly todaysCalendarListStateQuery: TodaysCalendarListStateQuery,
    ) {
        super();
    }

    fetch(): Observable<void> {
        const qb = RequestQueryBuilder.create().setFilter([
            {
                field: 'calendarId',
                operator: CondOperator.EQUALS,
                value: this.todaysCalendarListStateQuery.todaysCalendarId,
            },
            {
                field: 'operationNumber',
                operator: CondOperator.NOT_EQUALS,
                value: '100',
            },
        ]);

        return this.operationService.findMany(qb).pipe(
            tap((operations: OperationDetailsDto[]) => {
                this.set(operations);
            }),
            map(() => undefined),
        );
    }
}

@Injectable({ providedIn: 'root' })
export class TodaysOperationListStateQuery extends QueryEntity<TodaysOperationListState> {
    readonly todaysOperations$ = this.selectAll();
    readonly todaysOperationsSorted$ = this.selectAll().pipe(
        map((operations) =>
            [...operations].sort(
                (a, b) =>
                    Number(generateOperationSortNumber(a.operationNumber)) -
                    Number(generateOperationSortNumber(b.operationNumber)),
            ),
        ),
    );

    get todaysOperations(): OperationDetailsDto[] {
        return this.getAll();
    }

    constructor(protected store: TodaysOperationListStateStore) {
        super(store);
    }
}
