import { inject, Injectable } from '@angular/core';
import { select, setProps } from '@ngneat/elf';
import { map } from 'rxjs/operators';
import { createElfStore } from 'src/app/core/utils/elf-store';
import { generateOperationSortNumber } from 'src/app/core/utils/generate-operation-sort-number';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';

type State = {
    calendarId: string;
    operations: OperationDetailsDto[];
    operationTrips: OperationTripsDto[];
    stations: StationDetailsDto[];
    tripClasses: TripClassDetailsDto[];
};

@Injectable()
export class OperationTableStateStore {
    readonly state = createElfStore<State>({
        name: 'OperationTable',
        initialValue: {
            calendarId: null,
            operations: [],
            operationTrips: [],
            stations: [],
            tripClasses: [],
        },
    });

    setCalendarId(calendarId: string): void {
        this.state.update(
            setProps({
                calendarId,
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

    setOperationTrips(operationTrips: OperationTripsDto[]): void {
        this.state.update(
            setProps({
                operationTrips,
            }),
        );
    }

    setStations(stations: StationDetailsDto[]): void {
        this.state.update(
            setProps({
                stations,
            }),
        );
    }

    setTripClasses(tripClasses: TripClassDetailsDto[]): void {
        this.state.update(
            setProps({
                tripClasses,
            }),
        );
    }
}

@Injectable()
export class OperationTableStateQuery {
    readonly #store = inject(OperationTableStateStore);

    readonly calendarId$ = this.#store.state.pipe(
        select((state) => state.calendarId),
    );
    readonly operations$ = this.#store.state.pipe(
        select((state) => state.operations),
    );
    readonly operationTrips$ = this.#store.state.pipe(
        select((state) => state.operationTrips),
        map((operationTrips) =>
            [...operationTrips].sort(
                (a, b) =>
                    Number(
                        generateOperationSortNumber(
                            a.operation.operationNumber,
                        ),
                    ) -
                    Number(
                        generateOperationSortNumber(
                            b.operation.operationNumber,
                        ),
                    ),
            ),
        ),
    );
    readonly stations$ = this.#store.state.pipe(
        select((state) => state.stations),
    );
    readonly tripClasses$ = this.#store.state.pipe(
        select((state) => state.tripClasses),
    );

    get calendarId(): string {
        const { calendarId } = this.#store.state.getValue();
        return calendarId;
    }

    get operations(): OperationDetailsDto[] {
        const { operations } = this.#store.state.getValue();
        return operations;
    }
}
