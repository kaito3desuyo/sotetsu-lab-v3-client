import { inject } from '@angular/core';
import {
    patchState,
    signalStore,
    type,
    withComputed,
    withMethods,
} from '@ngrx/signals';
import {
    entityConfig,
    setAllEntities,
    withEntities,
} from '@ngrx/signals/entities';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { generateOperationSortNumber } from '../core/utils/generate-operation-sort-number';
import { withAppDevtools } from '../core/store-features/with-app-devtools';
import { OperationDetailsDto } from '../libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from '../libs/operation/usecase/operation.service';
import { TodaysCalendarListState } from './todays-calendar-list.state';

const operationConfig = entityConfig({
    entity: type<OperationDetailsDto>(),
    selectId: (operation) => operation.operationId,
});

export const TodaysOperationListState = signalStore(
    { providedIn: 'root' },
    withEntities(operationConfig),
    withComputed(({ entities }) => ({
        /** 取得した順の今日の運用 */
        todaysOperations: entities,
        todaysOperationsSorted: () =>
            [...entities()].sort(
                (a, b) =>
                    Number(generateOperationSortNumber(a.operationNumber)) -
                    Number(generateOperationSortNumber(b.operationNumber)),
            ),
    })),
    withMethods((store) => {
        const operationService = inject(OperationService);
        const todaysCalendarListState = inject(TodaysCalendarListState);

        return {
            fetch(): Observable<void> {
                return operationService
                    .findManyByCalendarId({
                        calendarId: todaysCalendarListState.todaysCalendarId(),
                    })
                    .pipe(
                        map((data) =>
                            data.filter((o) => o.operationNumber !== '100'),
                        ),
                        tap((data: OperationDetailsDto[]) => {
                            patchState(
                                store,
                                setAllEntities(data, operationConfig),
                            );
                        }),
                        map(() => undefined),
                    );
            },
        };
    }),
    withAppDevtools('TodaysOperationListState'),
);
