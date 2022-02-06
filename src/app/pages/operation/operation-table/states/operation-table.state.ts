import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';

type OperationTableState = {
    calendarId: string;
    operations: OperationDetailsDto[];
    allOperationTrips: OperationTripsDto[];
};

@Injectable()
export class OperationTableStateStore extends Store<OperationTableState> {
    constructor() {
        super(
            {
                calendarId: null,
                operations: [],
                allOperationTrips: [],
            },
            { name: `OperationTable-${guid()}` }
        );
    }

    setCalendarId(calendarId: string): void {
        this.update({
            calendarId,
        });
    }

    setOperations(operations: OperationDetailsDto[]): void {
        this.update({
            operations,
        });
    }

    setAllOperationTrips(allOperationTrips: OperationTripsDto[]): void {
        this.update({
            allOperationTrips,
        });
    }
}

@Injectable()
export class OperationTableStateQuery extends Query<OperationTableState> {
    readonly operations$ = this.select('operations');
    readonly allOperationTrips$ = this.select('allOperationTrips');

    get calendarId(): string {
        return this.getValue().calendarId;
    }

    get operations(): OperationDetailsDto[] {
        return this.getValue().operations;
    }

    constructor(protected store: OperationTableStateStore) {
        super(store);
    }
}
