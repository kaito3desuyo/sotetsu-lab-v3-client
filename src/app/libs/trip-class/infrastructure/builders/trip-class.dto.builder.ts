import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { TripClassDetailsDto } from '../../usecase/dtos/trip-class-details.dto';
import { TripClassModel } from '../models/trip-class.model';

export const TripClassDtoBuilder = {
    buildFromModel: (model: TripClassModel): TripClassDetailsDto => {
        const plainObject = classToPlain(model, classTransformerOptions);
        return plainToClass(
            TripClassDetailsDto,
            plainObject,
            classTransformerOptions,
        );
    },
} as const;

export const TripClassesDtoBuilder = {
    buildFromModels: (models: TripClassModel[]): TripClassDetailsDto[] => {
        return models.map((model) => TripClassDtoBuilder.buildFromModel(model));
    },
} as const;
