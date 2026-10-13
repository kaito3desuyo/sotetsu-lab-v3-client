import { AgencyDtoBuilder } from 'src/app/libs/agency/infrastructure/builders/agency.dto.builder';
import { CalendarDtoBuilder } from 'src/app/libs/calendar/infrastructure/builders/calendar.dto.builder';
import { OperationSightingTimeCrossSectionDto } from '../../usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationSightingTimeCrossSectionModel } from '../models/operation-sighting-time-cross-section.model';
import { OperationSightingDtoBuilder } from './operation-sighting.dto.builder';

type ExpectedModel = OperationSightingTimeCrossSectionModel['expectedSighting'];
type ExpectedDto = OperationSightingTimeCrossSectionDto['expectedSighting'];

/** 推定の目撃は id も入れ子も欠けうる（部分的な目撃）。あるものだけ付け替える */
const buildExpectedSighting = ({
    id,
    operation,
    formation,
    ...rest
}: ExpectedModel): ExpectedDto => ({
    ...rest,
    operationSightingId: id,
    operation: operation && {
        ...omitId(operation),
        operationId: operation.id,
        calendar:
            operation.calendar &&
            CalendarDtoBuilder.buildFromModel(operation.calendar),
    },
    formation: formation && {
        ...omitId(formation),
        formationId: formation.id,
        agency:
            formation.agency &&
            AgencyDtoBuilder.buildFromModel(formation.agency),
    },
});

function omitId<T extends { id?: string }>({ id, ...rest }: T): Omit<T, 'id'> {
    return rest;
}

export const OperationSightingTimeCrossSectionDtoBuilder = {
    buildFromModel: ({
        latestSighting,
        expectedSighting,
        ...rest
    }: OperationSightingTimeCrossSectionModel): OperationSightingTimeCrossSectionDto => ({
        ...rest,
        latestSighting:
            latestSighting &&
            OperationSightingDtoBuilder.buildFromModel(latestSighting),
        expectedSighting:
            expectedSighting && buildExpectedSighting(expectedSighting),
    }),
    buildFromModels: (
        models: OperationSightingTimeCrossSectionModel[],
    ): OperationSightingTimeCrossSectionDto[] =>
        models.map((model) =>
            OperationSightingTimeCrossSectionDtoBuilder.buildFromModel(model),
        ),
} as const;
