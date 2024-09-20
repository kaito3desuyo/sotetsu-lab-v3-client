import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { classTransformer } from 'src/app/core/utils/class-transformer';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from '../../usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationSightingTimeCrossSectionModel } from '../models/operation-sighting-time-cross-section.model';
import { OperationSightingModel } from '../models/operation-sighting.model';

export function buildOperationSightingDetailsDto(
    model: OperationSightingModel,
): OperationSightingDetailsDto {
    const plainObject = classToPlain(model, classTransformerOptions);
    return plainToClass(
        OperationSightingDetailsDto,
        plainObject,
        classTransformerOptions,
    );
}

export const OperationSightingDtoBuilder = {
    toDetailsDto: (
        model: OperationSightingModel,
    ): OperationSightingDetailsDto => {
        return classTransformer(model, OperationSightingDetailsDto);
    },
    toTimeCrossSectionDto: (
        model: OperationSightingTimeCrossSectionModel,
    ): OperationSightingTimeCrossSectionDto => {
        return classTransformer(model, OperationSightingTimeCrossSectionDto);
    },
} as const;
