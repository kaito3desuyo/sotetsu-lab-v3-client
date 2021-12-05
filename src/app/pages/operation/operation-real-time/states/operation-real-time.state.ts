import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import dayjs from 'dayjs';
import { flatMap, groupBy, sortBy, uniqBy } from 'lodash-es';
import { map } from 'rxjs/operators';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingWithCirculatedDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-with-circulated.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { calculateDayDifference } from '../utils/calculate-day-difference';
import { circulateOperationNumber } from '../utils/circulate-operation-number';
import { isExistNewerSightings } from '../utils/is-exist-newer-sightings';

type OperationRealTimeState = {
    operations: OperationDetailsDto[];
    formations: FormationDetailsDto[];
    operationSightings: OperationSightingDetailsDto[];
    formationSightings: OperationSightingDetailsDto[];
    currentPositions: OperationCurrentPositionDto[];
    stations: StationDetailsDto[];
    tripClasses: TripClassDetailsDto[];
};

@Injectable()
export class OperationRealTimeStateStore extends Store<OperationRealTimeState> {
    constructor() {
        super(
            {
                operations: [],
                formations: [],
                operationSightings: [],
                formationSightings: [],
                currentPositions: [],
                stations: [],
                tripClasses: [],
            },
            {
                name: `OperationRealTime-${guid()}`,
            }
        );
    }

    setOperations(operations: OperationDetailsDto[]): void {
        this.update({
            operations,
        });
    }

    setFormations(formations: FormationDetailsDto[]): void {
        this.update({
            formations,
        });
    }

    setOperationSightings(sightings: OperationSightingDetailsDto[]): void {
        this.update({
            operationSightings: sightings,
        });
    }

    setFormationSightings(sightings: OperationSightingDetailsDto[]): void {
        this.update({
            formationSightings: sightings,
        });
    }

    setCurrentPositions(positions: OperationCurrentPositionDto[]): void {
        this.update({
            currentPositions: positions,
        });
    }

    setStations(stations: StationDetailsDto[]): void {
        this.update({
            stations,
        });
    }

    setTripClasses(classes: TripClassDetailsDto[]): void {
        this.update({
            tripClasses: classes,
        });
    }
}

@Injectable()
export class OperationRealTimeStateQuery extends Query<OperationRealTimeState> {
    operations$ = this.select('operations');
    formations$ = this.select('formations');
    latestSightings$ = this.select([
        'operations',
        'operationSightings',
        'formationSightings',
    ]).pipe(map(this._findLatestAndCirculateOperationSighting));
    currentPositions$ = this.select('currentPositions');
    stations$ = this.select('stations');
    tripClasses$ = this.select('tripClasses');

    constructor(protected store: OperationRealTimeStateStore) {
        super(store);
    }

    private _findLatestAndCirculateOperationSighting({
        operations,
        operationSightings,
        formationSightings,
    }: {
        operations: OperationDetailsDto[];
        operationSightings: OperationSightingDetailsDto[];
        formationSightings: OperationSightingDetailsDto[];
    }): {
        operationSightings: OperationSightingWithCirculatedDto[];
        formationSightings: OperationSightingWithCirculatedDto[];
    } {
        const base = [...operationSightings, ...formationSightings];
        const uniqed = uniqBy(base, (o) => o.operationSightingId);
        const sorted = sortBy(uniqed, [
            (o) => dayjs(o.sightingTime),
            (o) => dayjs(o.updatedAt),
        ]);
        const reversed = [...sorted.reverse()];
        const addCirculated = reversed
            .map((o) => {
                const currentOperationNumber =
                    o.operation?.operationNumber ?? null;
                const circulatedOperationNumber =
                    currentOperationNumber !== '100' &&
                    currentOperationNumber !== null
                        ? circulateOperationNumber(
                              currentOperationNumber,
                              calculateDayDifference(o.sightingTime)
                          )
                        : currentOperationNumber;
                const circulatedOperation = circulatedOperationNumber
                    ? operations.find(
                          (op) =>
                              op.operationNumber === circulatedOperationNumber
                      ) ?? null
                    : null;

                return {
                    ...o,
                    circulatedOperationId:
                        circulatedOperation?.operationId ?? null,
                    circulatedOperation: circulatedOperation,
                };
            })
            .map((o, _, arr) => {
                const isEnable =
                    o.operation && o.operation.operationNumber !== '100';
                const isExistNewerSightingsStatus =
                    isExistNewerSightings(
                        o,
                        arr,
                        'circulatedOperation.operationNumber'
                    ) ||
                    isExistNewerSightings(o, arr, 'formation.formationNumber');

                return {
                    ...o,
                    circulatedOperationId:
                        isEnable && isExistNewerSightingsStatus
                            ? null
                            : o.circulatedOperationId,
                    circulatedOperation:
                        isEnable && isExistNewerSightingsStatus
                            ? null
                            : o.circulatedOperation,
                };
            });

        const operationGrouped = groupBy(
            addCirculated,
            (o) => o.circulatedOperation?.operationNumber
        );
        const formationGrouped = groupBy(
            addCirculated,
            (o) => o.formation?.formationNumber ?? null
        );
        const operationFlatted = flatMap(operationGrouped, (arr) => arr[0]);
        const formationFlatted = flatMap(formationGrouped, (arr) => arr[0]);

        return {
            operationSightings: operationFlatted,
            formationSightings: formationFlatted,
        };
    }
}
