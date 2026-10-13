import { OperationDtoBuilder } from 'src/app/libs/operation/infrastructure/builders/operation.dto.builder';
import { TripOperationListDetailsDto } from '../../usecase/dtos/trip-operation-list-details.dto';
import { TripOperationListModel } from '../models/trip-operation-list.model';
import { TimeDtoBuilder } from './time.dto.builder';
import { TripDtoBuilder } from './trip.dto.builder';

export const TripOperationListDtoBuilder = {
    buildFromModel: ({
        id,
        trip,
        operation,
        startTime,
        endTime,
        ...rest
    }: TripOperationListModel): TripOperationListDetailsDto => ({
        ...rest,
        tripOperationListId: id,
        trip: trip && TripDtoBuilder.buildFromModel(trip),
        operation: operation && OperationDtoBuilder.buildFromModel(operation),
        startTime: startTime && TimeDtoBuilder.buildFromModel(startTime),
        endTime: endTime && TimeDtoBuilder.buildFromModel(endTime),
    }),
    buildFromModels: (
        models: TripOperationListModel[],
    ): TripOperationListDetailsDto[] =>
        models.map((model) =>
            TripOperationListDtoBuilder.buildFromModel(model),
        ),
} as const;
