import { FormationDtoBuilder } from 'src/app/libs/formation/infrastructure/builders/formation.dto.builder';
import { OperationDtoBuilder } from 'src/app/libs/operation/infrastructure/builders/operation.dto.builder';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import { OperationSightingModel } from '../models/operation-sighting.model';

export const OperationSightingDtoBuilder = {
    buildFromModel: ({
        id,
        operation,
        formation,
        ...rest
    }: OperationSightingModel): OperationSightingDetailsDto => ({
        ...rest,
        operationSightingId: id,
        operation: operation && OperationDtoBuilder.buildFromModel(operation),
        formation: formation && FormationDtoBuilder.buildFromModel(formation),
    }),
    buildFromModels: (
        models: OperationSightingModel[],
    ): OperationSightingDetailsDto[] =>
        models.map((model) =>
            OperationSightingDtoBuilder.buildFromModel(model),
        ),
} as const;
