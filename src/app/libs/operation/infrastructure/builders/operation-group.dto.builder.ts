import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { OperationGroupDto } from '../../usecase/dtos/operation-group.dto';
import { OperationGroupModel } from '../models/operation-group.model';

export const OperationGroupDtoBuilder = {
    buildFromModel: (model: OperationGroupModel): OperationGroupDto => {
        const plainObject = classToPlain(model, classTransformerOptions);
        return plainToClass(
            OperationGroupDto,
            plainObject,
            classTransformerOptions,
        );
    },
} as const;

export const OperationGroupsDtoBuilder = {
    buildFromModels: (models: OperationGroupModel[]): OperationGroupDto[] => {
        return models.map((model) =>
            OperationGroupDtoBuilder.buildFromModel(model),
        );
    },
} as const;
