import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import { OperationModel } from '../models/operation.model';

export const OperationDtoBuilder = {
    buildFromModel: (model: OperationModel): OperationDetailsDto => {
        const plainObject = classToPlain(model, classTransformerOptions);
        return plainToClass(
            OperationDetailsDto,
            plainObject,
            classTransformerOptions,
        );
    },
    buildFromModels: (models: OperationModel[]): OperationDetailsDto[] =>
        models.map((model) => OperationDtoBuilder.buildFromModel(model)),
} as const;
