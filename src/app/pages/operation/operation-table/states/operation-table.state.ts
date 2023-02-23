import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';

type OperationTableState = {
    calendarId: string;
    operations: OperationDetailsDto[];
    operationNumbers: string[];
    operationTrips: OperationTripsDto[];
    stations: StationDetailsDto[];
    tripClasses: TripClassDetailsDto[];
};

@Injectable()
export class OperationTableStateStore extends Store<OperationTableState> {
    constructor() {
        super(
            {
                calendarId: null,
                operations: [],
                operationNumbers: [],
                operationTrips: [],
                stations: [],
                tripClasses: [],
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

    setOperationNumbers(numbers: string[]): void {
        this.update({
            operationNumbers: numbers,
        });
    }

    setOperationTrips(operationTrips: OperationTripsDto[]): void {
        this.update({
            operationTrips,
        });
    }

    setStations(stations: StationDetailsDto[]): void {
        this.update({
            stations,
        });
    }

    setTripClasses(tripClasses: TripClassDetailsDto[]): void {
        this.update({
            tripClasses,
        });
    }
}

@Injectable()
export class OperationTableStateQuery extends Query<OperationTableState> {
    readonly calendarId$ = this.select('calendarId');
    readonly operations$ = this.select('operations');
    readonly operationNumbers$ = this.select('operationNumbers');
    readonly operationTrips$ = this.select('operationTrips');
    readonly stations$ = this.select('stations');
    readonly tripClasses$ = this.select('tripClasses');

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
