import { classTransformer } from 'src/app/core/utils/class-transformer';
import { CreateOperationSightingDto } from '../../usecase/dtos/create-operation-sighting.dto';
import { OperationSightingModel } from '../models/operation-sighting.model';

export const OperationSightingModelBuilder = {
    fromCreateDto: (dto: CreateOperationSightingDto) => {
        return classTransformer(dto, OperationSightingModel);
    },
} as const;
