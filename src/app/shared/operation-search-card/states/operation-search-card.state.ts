import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { TodaysOperationListStateQuery } from 'src/app/global-states/todays-operation-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';

type OperationSearchCardState = {
    calendarId: CalendarDetailsDto['calendarId'];
    operationId: OperationDetailsDto['operationId'];
    calendars: CalendarDetailsDto[];
    operations: OperationDetailsDto[];
};

@Injectable()
export class OperationSearchCardStateStore extends Store<OperationSearchCardState> {
    constructor(
        private readonly calendarListStateQuery: CalendarListStateQuery,
        private readonly todaysCalendarListStateQuery: TodaysCalendarListStateQuery,
        private readonly todaysOperationListStateQuery: TodaysOperationListStateQuery
    ) {
        super(
            {
                calendarId: todaysCalendarListStateQuery.todaysCalendarId,
                operationId: null,
                calendars: calendarListStateQuery.calendars,
                operations: todaysOperationListStateQuery.todaysOperations,
            },
            { name: `OperationSearchCard-${guid()}` }
        );
    }

    setCalendarId(calendarId: CalendarDetailsDto['calendarId']): void {
        this.update({
            calendarId,
        });
    }

    setOperationId(operationId: OperationDetailsDto['operationId']): void {
        this.update({
            operationId,
        });
    }

    setOperations(operations: OperationDetailsDto[]): void {
        this.update({
            operations,
        });
    }
}

@Injectable()
export class OperationSearchCardStateQuery extends Query<OperationSearchCardState> {
    readonly calendarId$ = this.select('calendarId');
    readonly operationId$ = this.select('operationId');
    readonly calendars$ = this.select('calendars');
    readonly operations$ = this.select('operations');

    get calendarId(): CalendarDetailsDto['calendarId'] {
        return this.getValue().calendarId;
    }

    get operationId(): OperationDetailsDto['operationId'] {
        return this.getValue().operationId;
    }

    constructor(protected store: OperationSearchCardStateStore) {
        super(store);
    }
}
