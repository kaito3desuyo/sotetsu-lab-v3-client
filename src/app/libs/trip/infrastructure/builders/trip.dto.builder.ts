import { AllKeys } from 'src/app/core/utils/all-keys';
import { TripBlockDtoBuilder } from 'src/app/libs/trip-block/infrastructure/builders/trip-block.dto.builder';
import { TripClassDtoBuilder } from 'src/app/libs/trip-class/infrastructure/builders/trip-class.dto.builder';
import { TripDetailsDto } from '../../usecase/dtos/trip-details.dto';
import { TripModel } from '../models/trip.model';
import { TimeDtoBuilder } from './time.dto.builder';
import { TripOperationListDtoBuilder } from './trip-operation-list.dto.builder';

export const TripDtoBuilder = {
    buildFromModel: (model: TripModel): TripDetailsDto => {
        const dto: AllKeys<TripDetailsDto> = {
            tripId: model.id,
            serviceId: model.serviceId,
            tripNumber: model.tripNumber,
            tripClassId: model.tripClassId,
            tripName: model.tripName,
            tripDirection: model.tripDirection,
            tripBlockId: model.tripBlockId,
            depotIn: model.depotIn,
            depotOut: model.depotOut,
            calendarId: model.calendarId,
            extraCalendarId: model.extraCalendarId,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt,
            times: model.times && TimeDtoBuilder.buildFromModels(model.times),
            tripOperationLists:
                model.tripOperationLists &&
                TripOperationListDtoBuilder.buildFromModels(
                    model.tripOperationLists,
                ),
            tripClass:
                model.tripClass &&
                TripClassDtoBuilder.buildFromModel(model.tripClass),
            tripBlock:
                model.tripBlock &&
                TripBlockDtoBuilder.buildFromModel(model.tripBlock),
        };
        return dto;
    },
    buildFromModels: (models: TripModel[]): TripDetailsDto[] =>
        models.map((model) => TripDtoBuilder.buildFromModel(model)),
} as const;
