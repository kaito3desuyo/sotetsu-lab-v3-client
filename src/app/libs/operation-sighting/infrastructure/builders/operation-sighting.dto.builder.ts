import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import { OperationSightingModel } from '../models/operation-sighting.model';

export const OperationSightingDtoBuilder = {
    buildFromModel: (
        model: OperationSightingModel,
    ): OperationSightingDetailsDto => {
        const plainObject = classToPlain(model, classTransformerOptions);
        return plainToClass(
            OperationSightingDetailsDto,
            plainObject,
            classTransformerOptions,
        );
    },
} as const;

export const OperationSightingsDtoBuilder = {
    buildFromModels: (
        models: OperationSightingModel[],
    ): OperationSightingDetailsDto[] => {
        return models.map((model) =>
            OperationSightingDtoBuilder.buildFromModel(model),
        );
    },
} as const;
