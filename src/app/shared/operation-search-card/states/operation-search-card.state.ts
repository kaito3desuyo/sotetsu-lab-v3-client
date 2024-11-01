import { inject, Injectable } from '@angular/core';
import { select, setProps } from '@ngneat/elf';
import { map } from 'rxjs/operators';
import { createElfStore } from 'src/app/core/utils/elf-store';
import { generateOperationSortNumber } from 'src/app/core/utils/generate-operation-sort-number';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { TodaysOperationListStateQuery } from 'src/app/global-states/todays-operation-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';

type State = {
    calendarId: CalendarDetailsDto['calendarId'];
    operationId: OperationDetailsDto['operationId'];
    calendars: CalendarDetailsDto[];
    operations: OperationDetailsDto[];
};

@Injectable()
export class OperationSearchCardStateStore {
    readonly #calendarListStateQuery = inject(CalendarListStateQuery);
    readonly #todaysCalendarListStateQuery = inject(
        TodaysCalendarListStateQuery,
    );
    readonly #todaysOperationListStateQuery = inject(
        TodaysOperationListStateQuery,
    );

    readonly state = createElfStore<State>({
        name: 'OperationSearchCard',
        initialValue: {
            calendarId: this.#todaysCalendarListStateQuery.todaysCalendarId,
            operationId: null,
            calendars: this.#calendarListStateQuery.calendars,
            operations: this.#todaysOperationListStateQuery.todaysOperations,
        },
    });

    setCalendarId(calendarId: CalendarDetailsDto['calendarId']): void {
        this.state.update(
            setProps({
                calendarId,
            }),
        );
    }

    setOperationId(operationId: OperationDetailsDto['operationId']): void {
        this.state.update(
            setProps({
                operationId,
            }),
        );
    }

    setOperations(operations: OperationDetailsDto[]): void {
        this.state.update(
            setProps({
                operations,
            }),
        );
    }
}

@Injectable()
export class OperationSearchCardStateQuery {
    readonly #store = inject(OperationSearchCardStateStore);

    readonly calendarId$ = this.#store.state.pipe(
        select((state) => state.calendarId),
    );
    readonly operationId$ = this.#store.state.pipe(
        select((state) => state.operationId),
    );
    readonly calendars$ = this.#store.state.pipe(
        select((state) => state.calendars),
    );
    readonly operations$ = this.#store.state.pipe(
        select((state) => state.operations),
        map((operations) =>
            [...operations].sort(
                (a, b) =>
                    Number(generateOperationSortNumber(a.operationNumber)) -
                    Number(generateOperationSortNumber(b.operationNumber)),
            ),
        ),
    );

    get calendarId(): CalendarDetailsDto['calendarId'] {
        const { calendarId } = this.#store.state.getValue();
        return calendarId;
    }

    get operationId(): OperationDetailsDto['operationId'] {
        const { operationId } = this.#store.state.getValue();
        return operationId;
    }
}
