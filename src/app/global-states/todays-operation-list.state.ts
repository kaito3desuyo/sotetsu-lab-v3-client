import { inject, Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import { createStore } from '@ngneat/elf';
import {
    getAllEntities,
    selectEntities,
    setEntities,
    withEntities,
} from '@ngneat/elf-entities';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { generateOperationSortNumber } from '../core/utils/generate-operation-sort-number';
import { OperationDetailsDto } from '../libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from '../libs/operation/usecase/operation.service';
import { TodaysCalendarListStateQuery } from './todays-calendar-list.state';

type State = OperationDetailsDto;

const state = createStore(
    { name: 'TodaysOperationList' },
    withEntities<State, 'operationId'>({
        initialValue: [],
        idKey: 'operationId',
    }),
);

@Injectable({ providedIn: 'root' })
export class TodaysOperationListStateStore {
    readonly #operationService = inject(OperationService);
    readonly #todaysCalendarListStateQuery = inject(
        TodaysCalendarListStateQuery,
    );

    fetch(): Observable<void> {
        const qb = RequestQueryBuilder.create().setFilter([
            {
                field: 'calendarId',
                operator: CondOperator.EQUALS,
                value: this.#todaysCalendarListStateQuery.todaysCalendarId,
            },
            {
                field: 'operationNumber',
                operator: CondOperator.NOT_EQUALS,
                value: '100',
            },
        ]);

        return this.#operationService.findMany(qb).pipe(
            tap((data: OperationDetailsDto[]) => {
                state.update(setEntities(data));
            }),
            map(() => undefined),
        );
    }
}

@Injectable({ providedIn: 'root' })
export class TodaysOperationListStateQuery {
    readonly todaysOperations$ = state.pipe(
        selectEntities(),
        map((operationsMap) =>
            Object.entries(operationsMap).map(([_, value]) => value),
        ),
    );
    readonly todaysOperationsSorted$ = this.todaysOperations$.pipe(
        map((operations) =>
            [...operations].sort(
                (a, b) =>
                    Number(generateOperationSortNumber(a.operationNumber)) -
                    Number(generateOperationSortNumber(b.operationNumber)),
            ),
        ),
    );

    get todaysOperations(): OperationDetailsDto[] {
        return state.query(getAllEntities());
    }
}
