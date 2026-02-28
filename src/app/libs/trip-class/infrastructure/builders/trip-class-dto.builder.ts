import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { classTransformer } from 'src/app/core/utils/class-transformer';
import { TripClassDetailsDto } from '../../usecase/dtos/trip-class-details.dto';
import { TripClassModel } from '../models/trip-class.model';

export function buildTripClassDetailsDto(
    model: TripClassModel,
): TripClassDetailsDto {
    const plainObject = classToPlain(model, classTransformerOptions);
    return plainToClass(
        TripClassDetailsDto,
        plainObject,
        classTransformerOptions,
    );
}

export const TripClassDtoBuilder = {
    toDetailsDto: (model: TripClassModel): TripClassDetailsDto => {
        return classTransformer(model, TripClassDetailsDto);
    },
} as const;

export const TripClassesDtoBuilder = {
    toDetailsDtos: (models: TripClassModel[]): TripClassDetailsDto[] => {
        return models.map((model) => TripClassDtoBuilder.toDetailsDto(model));
    },
} as const;
