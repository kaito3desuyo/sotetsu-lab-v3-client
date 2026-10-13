import { TripDtoBuilder } from 'src/app/libs/trip/infrastructure/builders/trip.dto.builder';
import { TripClassDetailsDto } from '../../usecase/dtos/trip-class-details.dto';
import { TripClassModel } from '../models/trip-class.model';

export const TripClassDtoBuilder = {
    buildFromModel: ({
        id,
        trips,
        ...rest
    }: TripClassModel): TripClassDetailsDto => ({
        ...rest,
        tripClassId: id,
        trips: trips && TripDtoBuilder.buildFromModels(trips),
    }),
    buildFromModels: (models: TripClassModel[]): TripClassDetailsDto[] =>
        models.map((model) => TripClassDtoBuilder.buildFromModel(model)),
} as const;
