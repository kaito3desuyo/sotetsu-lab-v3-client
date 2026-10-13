import { TripDtoBuilder } from 'src/app/libs/trip/infrastructure/builders/trip.dto.builder';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import { TripBlockModel } from '../models/trip-block.model';

export const TripBlockDtoBuilder = {
    buildFromModel: ({
        id,
        trips,
        ...rest
    }: TripBlockModel): TripBlockDetailsDto => ({
        ...rest,
        tripBlockId: id,
        trips: trips && TripDtoBuilder.buildFromModels(trips),
    }),
    buildFromModels: (models: TripBlockModel[]): TripBlockDetailsDto[] =>
        models.map((model) => TripBlockDtoBuilder.buildFromModel(model)),
} as const;
