import { instanceToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { CreateTripBlockDto } from '../../usecase/dtos/create-trip-block.dto';
import { ReplaceTripBlockDto } from '../../usecase/dtos/replace-trip-block.dto';
import { TripBlockModel } from '../models/trip-block.model';

const transformer = <T>(dto: T) => {
    const plainObject = instanceToPlain(dto, classTransformerOptions);
    return plainToClass(TripBlockModel, plainObject, classTransformerOptions);
};

export const TripBlockModelBuilder = {
    fromCreateDto: (dto: CreateTripBlockDto) => {
        return transformer(dto);
    },
    fromReplaceDto: (dto: ReplaceTripBlockDto) => {
        return transformer(dto);
    },
} as const;
