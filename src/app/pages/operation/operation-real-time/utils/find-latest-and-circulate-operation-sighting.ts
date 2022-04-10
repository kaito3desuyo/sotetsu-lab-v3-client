import dayjs from 'dayjs';
import { flatMap, groupBy, sortBy, uniqBy } from 'lodash-es';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingWithCirculatedDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-with-circulated.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { calculateDayDifference } from 'src/app/pages/operation/operation-real-time/utils/calculate-day-difference';
import { circulateOperationNumber } from 'src/app/pages/operation/operation-real-time/utils/circulate-operation-number';
import { isExistNewerSightings } from 'src/app/pages/operation/operation-real-time/utils/is-exist-newer-sightings';

export function findLatestAndCirculateOperationSighting({
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
            const currentOperationNumber = o.operation?.operationNumber ?? null;
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
                      (op) => op.operationNumber === circulatedOperationNumber
                  ) ?? null
                : null;

            return {
                ...o,
                circulatedOperationId: circulatedOperation?.operationId ?? null,
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
                ) || isExistNewerSightings(o, arr, 'formation.formationNumber');

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
