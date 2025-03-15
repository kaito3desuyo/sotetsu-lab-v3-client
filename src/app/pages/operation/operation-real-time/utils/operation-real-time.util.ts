import dayjs from 'dayjs';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { IOperationRealTimeTableData } from '../interfaces/operation-real-time-table-data.interface';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';

function generateOperationTableData(
    operations: OperationDetailsDto[],
    timeCrossSections: OperationSightingTimeCrossSectionDto[],
    histories: OperationSightingDetailsDto[],
    positions: OperationCurrentPositionDto[],
): IOperationRealTimeTableData[] {
    const data = operations
        .filter((o) => o.operationNumber !== '100')
        .map((o) => {
            const timeCrossSection =
                timeCrossSections.find(
                    (so) =>
                        so.expectedSighting?.operation?.operationNumber ===
                        o.operationNumber,
                ) ?? null;
            const sightingHistories = histories.filter(
                (so) =>
                    o.operationId === so.operationId &&
                    !timeCrossSections.some(
                        (tcs) =>
                            tcs.expectedSighting?.formation?.formationNumber &&
                            tcs.latestSighting?.operationSightingId ===
                                so.operationSightingId,
                    ),
            );
            const currentPosition =
                positions.find(
                    (so) => so.operation.operationId === o.operationId,
                ) ?? null;

            return {
                operation: o,
                timeCrossSection,
                sightingHistories,
                currentPosition,
            };
        });

    return data;
}

function generateFormationTableData(
    formations: FormationDetailsDto[],
    timeCrossSections: OperationSightingTimeCrossSectionDto[],
    histories: OperationSightingDetailsDto[],
    positions: OperationCurrentPositionDto[],
): IOperationRealTimeTableData[] {
    const data = formations.map((o) => {
        const timeCrossSection =
            timeCrossSections.find(
                (so) =>
                    so.expectedSighting?.formation?.formationNumber ===
                    o.formationNumber,
            ) ?? null;
        const sightingHistories = histories.filter(
            (so) =>
                o.formationId === so.formationId &&
                !timeCrossSections.some(
                    (tcs) =>
                        tcs.expectedSighting?.operation?.operationNumber &&
                        tcs.latestSighting?.operationSightingId ===
                            so.operationSightingId,
                ),
        );
        const currentPosition =
            positions.find(
                (so) =>
                    so.operation.operationId ===
                    timeCrossSection?.expectedSighting?.operation?.operationId,
            ) ?? null;

        return {
            formation: o,
            timeCrossSection,
            sightingHistories,
            currentPosition,
        };
    });

    return data;
}

function filterOperationCurrentPositionsThatShouldUpdate(
    currentPositions: OperationCurrentPositionDto[],
): OperationCurrentPositionDto[] {
    const now = dayjs();
    const target = (days: number, time: string) =>
        dayjs(time, 'HH:mm:ss').add(
            days - (now.hour() < 4 ? 1 : 0) - 1,
            'days',
        );

    return currentPositions.filter(({ position }) => {
        // 出庫前
        if (!position.prev && !position.current && !!position.next) {
            return (
                now >=
                target(
                    position.next.startTime.departureDays,
                    position.next.startTime.departureTime,
                )
            );
        }

        // 走行中
        if (!position.prev && !!position.current && !position.next) {
            return (
                now >=
                target(
                    position.current.endTime.arrivalDays,
                    position.current.endTime.arrivalTime,
                )
            );
        }

        // 間隙時間
        if (!!position.prev && !position.current && !!position.next) {
            return (
                now >=
                target(
                    position.next.startTime.departureDays,
                    position.next.startTime.departureTime,
                )
            );
        }

        // 入庫済み
        if (!!position.prev && !position.current && !position.next) {
            return false;
        }

        return false;
    });
}

export const OperationRealTimeUtil = {
    generateOperationTableData,
    generateFormationTableData,
    filterOperationCurrentPositionsThatShouldUpdate,
} as const;
