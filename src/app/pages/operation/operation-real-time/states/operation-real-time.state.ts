import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import dayjs from 'dayjs';
import { flatMap, groupBy, sortBy, uniqBy } from 'lodash-es';
import { map } from 'rxjs/operators';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { calculateDayDifference } from '../utils/calculate-day-difference';
import { circulateOperationNumber } from '../utils/circulate-operation-number';
import { isExistNewerSightings } from '../utils/is-exist-newer-sightings';

type OperationRealTimeState = {
    operations: OperationDetailsDto[];
    operationSightings: OperationSightingDetailsDto[];
    formationSightings: OperationSightingDetailsDto[];
    currentPositions: {
        operation: OperationDetailsDto;
        position: {
            prev: TripOperationListDetailsDto;
            current: TripOperationListDetailsDto;
            next: TripOperationListDetailsDto;
        };
    }[];
};

@Injectable()
export class OperationRealTimeStateStore extends Store<OperationRealTimeState> {
    constructor() {
        super(
            {
                operations: [],
                operationSightings: [],
                formationSightings: [],
                currentPositions: [],
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

    setCurrentPositions(
        positions: {
            operation: OperationDetailsDto;
            position: {
                prev: TripOperationListDetailsDto;
                current: TripOperationListDetailsDto;
                next: TripOperationListDetailsDto;
            };
        }[]
    ): void {
        this.update({
            currentPositions: positions,
        });
    }
}

@Injectable()
export class OperationRealTimeStateQuery extends Query<OperationRealTimeState> {
    operations$ = this.select('operations');
    latestSightings$ = this.select([
        'operations',
        'operationSightings',
        'formationSightings',
    ]).pipe(
        map(({ operations, operationSightings, formationSightings }) => {
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
                                  op.operationNumber ===
                                  circulatedOperationNumber
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
                    const isEnableExclude =
                        o.operation && o.operation.operationNumber !== '100';
                    const isExistNewerSightingsStatus =
                        isExistNewerSightings(
                            o,
                            arr,
                            'operation.operationNumber'
                        ) ||
                        isExistNewerSightings(
                            o,
                            arr,
                            'formation.formationNumber'
                        );

                    return {
                        ...o,
                        circulatedOperationId:
                            isEnableExclude && isExistNewerSightingsStatus
                                ? null
                                : o.circulatedOperationId,
                        circulatedOperation:
                            isEnableExclude && isExistNewerSightingsStatus
                                ? null
                                : o.circulatedOperation,
                    };
                });

            const operationGrouped = groupBy(
                addCirculated,
                (o) => o.circulatedOperation?.operationNumber ?? null
            );
            const formationGrouped = groupBy(
                addCirculated,
                (o) => o.circulatedOperation?.operationNumber ?? null
            );
            const operationFlatted = flatMap(operationGrouped, (arr) => arr[0]);
            const formationFlatted = flatMap(formationGrouped, (arr) => arr[0]);

            return {
                operationSightings: operationFlatted,
                formationSightings: formationFlatted,
            };
        })
    );

    constructor(protected store: OperationRealTimeStateStore) {
        super(store);
    }
}
