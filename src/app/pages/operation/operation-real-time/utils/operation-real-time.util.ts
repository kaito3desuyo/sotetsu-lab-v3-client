import { OperationSightingWithCirculatedDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-with-circulated.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { IOperationRealTimeTableData } from '../interfaces/operation-real-time-table-data.interface';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';

function generateOperationTableData(
    operations: OperationDetailsDto[],
    sightings: OperationSightingWithCirculatedDto[],
    positions: OperationCurrentPositionDto[]
): IOperationRealTimeTableData[] {
    const data = operations
        .filter((o) => o.operationNumber !== '100')
        .map((o) => {
            const sighting = sightings.find(
                (so) => so.circulatedOperationId === o.operationId
            );
            const position = positions.find(
                (so) => so.operation.operationId === o.operationId
            );

            return {
                operation: o,
                operationSighting: sighting ?? null,
                currentPosition: position ?? null,
            };
        });

    return data;
}

function generateFormationTableData(
    formations: FormationDetailsDto[],
    sightings: OperationSightingWithCirculatedDto[],
    positions: OperationCurrentPositionDto[]
): IOperationRealTimeTableData[] {
    const data = formations.map((o) => {
        const sighting = sightings.find(
            (so) => so.formationId === o.formationId
        );
        const position = positions.find(
            (so) => so.operation.operationId === sighting?.circulatedOperationId
        );

        return {
            formation: o,
            operationSighting: sighting ?? null,
            currentPosition: position ?? null,
        };
    });

    return data;
}

export const OperationRealTimeUtil = {
    generateOperationTableData,
    generateFormationTableData,
} as const;
