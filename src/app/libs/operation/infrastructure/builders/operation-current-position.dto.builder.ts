import { classTransformer } from 'src/app/core/utils/class-transformer';
import { OperationCurrentPositionDto } from '../../usecase/dtos/operation-current-position.dto';
import { OperationCurrentPositionModel } from '../models/operation-current-position.model';

export const OperationCurrentPositionDtoBuilder = {
    buildFromModel: (
        model: OperationCurrentPositionModel,
    ): OperationCurrentPositionDto => {
        return classTransformer(model, OperationCurrentPositionDto);
    },
    buildFromModels: (
        models: OperationCurrentPositionModel[],
    ): OperationCurrentPositionDto[] =>
        models.map((model) =>
            OperationCurrentPositionDtoBuilder.buildFromModel(model),
        ),
} as const;
