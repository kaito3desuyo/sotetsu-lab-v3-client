import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { classTransformer } from 'src/app/core/utils/class-transformer';
import { OperationCurrentPositionDto } from '../../usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import { OperationCurrentPositionModel } from '../models/operation-current-position.model';
import { OperationModel } from '../models/operation.model';

export function buildOperationDetailsDto(
    model: OperationModel,
): OperationDetailsDto {
    const plainObject = classToPlain(model, classTransformerOptions);
    return plainToClass(
        OperationDetailsDto,
        plainObject,
        classTransformerOptions,
    );
}

export const OperationDtoBuilder = {
    toDetailsDto: (model: OperationModel): OperationDetailsDto => {
        return classTransformer(model, OperationDetailsDto);
    },
    toCurrentPositionDto: (model: OperationCurrentPositionModel) => {
        return classTransformer(model, OperationCurrentPositionDto);
    },
} as const;

export const OperationsDtoBuilder = {
    toDetailsDto: (models: OperationModel[]): OperationDetailsDto[] => {
        return models.map((model) => OperationDtoBuilder.toDetailsDto(model));
    },
} as const;
