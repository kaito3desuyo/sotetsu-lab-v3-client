import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';

type OperationRouteDiagramState = {
    operationId: string;
    operationTrips: OperationTripsDto;
    stations: StationDetailsDto[];
};

@Injectable()
export class OperationRouteDiagramStateStore extends Store<OperationRouteDiagramState> {
    constructor() {
        super(
            {
                operationId: null,
                operationTrips: null,
                stations: [],
            },
            { name: `OperationRouteDiagram-${guid()}` }
        );
    }

    setOperationId(operationId: string): void {
        this.update({
            operationId,
        });
    }

    setOperationTrips(operationTrips: OperationTripsDto): void {
        this.update({
            operationTrips,
        });
    }

    setStations(stations: StationDetailsDto[]): void {
        this.update({
            stations,
        });
    }
}

@Injectable()
export class OperationRouteDiagramStateQuery extends Query<OperationRouteDiagramState> {
    readonly operation$ = this.select(
        (state) => state.operationTrips?.operation
    );
    readonly calendar$ = this.select(
        (state) => state.operationTrips?.operation.calendar
    );
    readonly tripOperationLists$ = this.select(
        (state) => state.operationTrips?.trips
    );
    readonly stations$ = this.select('stations');

    get operationId(): string {
        return this.getValue().operationId;
    }

    constructor(protected store: OperationRouteDiagramStateStore) {
        super(store);
    }
}
