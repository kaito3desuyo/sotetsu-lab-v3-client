import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { IOperationRealTimeTableData } from '../interfaces/operation-real-time-table-data.interface';

function generateOperationTableData(
    operations: OperationDetailsDto[],
    timeCrossSections: OperationSightingTimeCrossSectionDto[],
    positions: OperationCurrentPositionDto[]
): IOperationRealTimeTableData[] {
    const data = operations
        .filter((o) => o.operationNumber !== '100')
        .map((o) => {
            const timeCrossSection =
                timeCrossSections.find(
                    (so) =>
                        so.expectedSighting?.operation?.operationNumber ===
                        o.operationNumber
                ) ?? null;
            const currentPosition =
                positions.find(
                    (so) => so.operation.operationId === o.operationId
                ) ?? null;

            return {
                operation: o,
                timeCrossSection,
                currentPosition,
            };
        });

    return data;
}

function generateFormationTableData(
    formations: FormationDetailsDto[],
    timeCrossSections: OperationSightingTimeCrossSectionDto[],
    positions: OperationCurrentPositionDto[]
): IOperationRealTimeTableData[] {
    const data = formations.map((o) => {
        const timeCrossSection =
            timeCrossSections.find(
                (so) =>
                    so.expectedSighting?.formation?.formationNumber ===
                    o.formationNumber
            ) ?? null;
        const currentPosition =
            positions.find(
                (so) =>
                    so.operation.operationId ===
                    timeCrossSection?.expectedSighting.operation.operationId
            ) ?? null;

        return {
            formation: o,
            timeCrossSection,
            currentPosition,
        };
    });

    return data;
}

export const OperationRealTimeUtil = {
    generateOperationTableData,
    generateFormationTableData,
} as const;
