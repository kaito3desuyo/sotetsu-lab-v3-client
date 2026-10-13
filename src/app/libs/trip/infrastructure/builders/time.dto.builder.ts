import { StationDtoBuilder } from 'src/app/libs/station/infrastructure/builders/station.dto.builder';
import { StopDtoBuilder } from 'src/app/libs/station/infrastructure/builders/stop.dto.builder';
import { TimeDetailsDto } from '../../usecase/dtos/time-details.dto';
import { TimeModel } from '../models/time.model';
import { TripOperationListDtoBuilder } from './trip-operation-list.dto.builder';
import { TripDtoBuilder } from './trip.dto.builder';

export const TimeDtoBuilder = {
    buildFromModel: ({
        id,
        trip,
        station,
        stop,
        startTripOperationLists,
        endTripOperationLists,
        ...rest
    }: TimeModel): TimeDetailsDto => ({
        ...rest,
        timeId: id,
        trip: trip && TripDtoBuilder.buildFromModel(trip),
        station: station && StationDtoBuilder.buildFromModel(station),
        stop: stop && StopDtoBuilder.buildFromModel(stop),
        startTripOperationLists:
            startTripOperationLists &&
            TripOperationListDtoBuilder.buildFromModels(
                startTripOperationLists,
            ),
        endTripOperationLists:
            endTripOperationLists &&
            TripOperationListDtoBuilder.buildFromModels(endTripOperationLists),
    }),
    buildFromModels: (models: TimeModel[]): TimeDetailsDto[] =>
        models.map((model) => TimeDtoBuilder.buildFromModel(model)),
} as const;
