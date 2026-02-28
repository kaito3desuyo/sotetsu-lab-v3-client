import { classTransformer } from 'src/app/core/utils/class-transformer';
import { OperationCurrentPositionDto } from '../../usecase/dtos/operation-current-position.dto';
import { OperationCurrentPositionModel } from '../models/operation-current-position.model';

export const OperationCurrentPositionDtoBuilder = {
    toCurrentPositionDto: (model: OperationCurrentPositionModel) => {
        return classTransformer(model, OperationCurrentPositionDto);
    },
} as const;
