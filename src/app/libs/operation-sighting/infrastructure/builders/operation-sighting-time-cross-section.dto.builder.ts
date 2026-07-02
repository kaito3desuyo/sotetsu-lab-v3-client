import { classTransformer } from 'src/app/core/utils/class-transformer';
import { OperationSightingTimeCrossSectionDto } from '../../usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationSightingTimeCrossSectionModel } from '../models/operation-sighting-time-cross-section.model';

export const OperationSightingTimeCrossSectionDtoBuilder = {
    buildFromModel: (
        model: OperationSightingTimeCrossSectionModel,
    ): OperationSightingTimeCrossSectionDto => {
        return classTransformer(model, OperationSightingTimeCrossSectionDto);
    },
} as const;
