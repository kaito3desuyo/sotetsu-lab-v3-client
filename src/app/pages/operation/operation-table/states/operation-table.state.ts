import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';

type OperationTableState = {
    operations: OperationDetailsDto[];
    allOperationTrips: OperationTripsDto[];
};

@Injectable()
export class OperationTableStateStore extends Store<OperationTableState> {
    constructor() {
        super(
            {
                operations: [],
                allOperationTrips: [],
            },
            { name: `OperationTable-${guid()}` }
        );
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

    get operations(): OperationDetailsDto[] {
        return this.getValue().operations;
    }

    constructor(protected store: OperationTableStateStore) {
        super(store);
    }
}
