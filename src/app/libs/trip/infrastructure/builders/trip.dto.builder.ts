import { TripBlockDtoBuilder } from 'src/app/libs/trip-block/infrastructure/builders/trip-block.dto.builder';
import { TripClassDtoBuilder } from 'src/app/libs/trip-class/infrastructure/builders/trip-class.dto.builder';
import { TripDetailsDto } from '../../usecase/dtos/trip-details.dto';
import { TripModel } from '../models/trip.model';
import { TimeDtoBuilder } from './time.dto.builder';
import { TripOperationListDtoBuilder } from './trip-operation-list.dto.builder';

export const TripDtoBuilder = {
    buildFromModel: ({
        id,
        times,
        tripOperationLists,
        tripClass,
        tripBlock,
        ...rest
    }: TripModel): TripDetailsDto => ({
        ...rest,
        tripId: id,
        times: times && TimeDtoBuilder.buildFromModels(times),
        tripOperationLists:
            tripOperationLists &&
            TripOperationListDtoBuilder.buildFromModels(tripOperationLists),
        tripClass: tripClass && TripClassDtoBuilder.buildFromModel(tripClass),
        tripBlock: tripBlock && TripBlockDtoBuilder.buildFromModel(tripBlock),
    }),
    buildFromModels: (models: TripModel[]): TripDetailsDto[] =>
        models.map((model) => TripDtoBuilder.buildFromModel(model)),
} as const;
