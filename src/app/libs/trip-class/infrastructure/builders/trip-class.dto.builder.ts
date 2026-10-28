import { AllKeys } from 'src/app/core/utils/all-keys';
import { TripDtoBuilder } from 'src/app/libs/trip/infrastructure/builders/trip.dto.builder';
import { TripClassDetailsDto } from '../../usecase/dtos/trip-class-details.dto';
import { TripClassModel } from '../models/trip-class.model';

export const TripClassDtoBuilder = {
    buildFromModel: (model: TripClassModel): TripClassDetailsDto => {
        const dto: AllKeys<TripClassDetailsDto> = {
            tripClassId: model.id,
            serviceId: model.serviceId,
            tripClassName: model.tripClassName,
            tripClassColor: model.tripClassColor,
            sequence: model.sequence,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt,
            trips: model.trips && TripDtoBuilder.buildFromModels(model.trips),
        };
        return dto;
    },
    buildFromModels: (models: TripClassModel[]): TripClassDetailsDto[] =>
        models.map((model) => TripClassDtoBuilder.buildFromModel(model)),
} as const;
