import { AllKeys } from 'src/app/core/utils/all-keys';
import { TripDtoBuilder } from 'src/app/libs/trip/infrastructure/builders/trip.dto.builder';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import { TripBlockModel } from '../models/trip-block.model';

export const TripBlockDtoBuilder = {
    buildFromModel: (model: TripBlockModel): TripBlockDetailsDto => {
        const dto: AllKeys<TripBlockDetailsDto> = {
            tripBlockId: model.id,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt,
            trips: model.trips && TripDtoBuilder.buildFromModels(model.trips),
        };
        return dto;
    },
    buildFromModels: (models: TripBlockModel[]): TripBlockDetailsDto[] =>
        models.map((model) => TripBlockDtoBuilder.buildFromModel(model)),
} as const;
