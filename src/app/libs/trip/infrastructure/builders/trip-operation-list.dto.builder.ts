import { AllKeys } from 'src/app/core/utils/all-keys';
import { OperationDtoBuilder } from 'src/app/libs/operation/infrastructure/builders/operation.dto.builder';
import { TripOperationListDetailsDto } from '../../usecase/dtos/trip-operation-list-details.dto';
import { TripOperationListModel } from '../models/trip-operation-list.model';
import { TimeDtoBuilder } from './time.dto.builder';
import { TripDtoBuilder } from './trip.dto.builder';

export const TripOperationListDtoBuilder = {
    buildFromModel: (
        model: TripOperationListModel,
    ): TripOperationListDetailsDto => {
        const dto: AllKeys<TripOperationListDetailsDto> = {
            tripOperationListId: model.id,
            tripId: model.tripId,
            operationId: model.operationId,
            startTimeId: model.startTimeId,
            endTimeId: model.endTimeId,
            startStationId: model.startStationId,
            endStationId: model.endStationId,
            nextTripOperationListId: model.nextTripOperationListId,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt,
            trip: model.trip && TripDtoBuilder.buildFromModel(model.trip),
            operation:
                model.operation &&
                OperationDtoBuilder.buildFromModel(model.operation),
            startTime:
                model.startTime &&
                TimeDtoBuilder.buildFromModel(model.startTime),
            endTime:
                model.endTime && TimeDtoBuilder.buildFromModel(model.endTime),
        };
        return dto;
    },
    buildFromModels: (
        models: TripOperationListModel[],
    ): TripOperationListDetailsDto[] =>
        models.map((model) =>
            TripOperationListDtoBuilder.buildFromModel(model),
        ),
} as const;
