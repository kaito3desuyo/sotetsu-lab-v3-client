import { AllKeys } from 'src/app/core/utils/all-keys';
import { StationDtoBuilder } from 'src/app/libs/station/infrastructure/builders/station.dto.builder';
import { StopDtoBuilder } from 'src/app/libs/station/infrastructure/builders/stop.dto.builder';
import { TimeDetailsDto } from '../../usecase/dtos/time-details.dto';
import { TimeModel } from '../models/time.model';
import { TripOperationListDtoBuilder } from './trip-operation-list.dto.builder';
import { TripDtoBuilder } from './trip.dto.builder';

export const TimeDtoBuilder = {
    // 展開（...）はビルドで遅い補助関数になるため、項目を書き並べる
    buildFromModel: (model: TimeModel): TimeDetailsDto => {
        const dto: AllKeys<TimeDetailsDto> = {
            timeId: model.id,
            tripId: model.tripId,
            stationId: model.stationId,
            stopId: model.stopId,
            stopSequence: model.stopSequence,
            pickupType: model.pickupType,
            dropoffType: model.dropoffType,
            arrivalDays: model.arrivalDays,
            arrivalTime: model.arrivalTime,
            departureDays: model.departureDays,
            departureTime: model.departureTime,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt,
            trip: model.trip && TripDtoBuilder.buildFromModel(model.trip),
            station:
                model.station &&
                StationDtoBuilder.buildFromModel(model.station),
            stop: model.stop && StopDtoBuilder.buildFromModel(model.stop),
            startTripOperationLists:
                model.startTripOperationLists &&
                TripOperationListDtoBuilder.buildFromModels(
                    model.startTripOperationLists,
                ),
            endTripOperationLists:
                model.endTripOperationLists &&
                TripOperationListDtoBuilder.buildFromModels(
                    model.endTripOperationLists,
                ),
        };
        return dto;
    },
    buildFromModels: (models: TimeModel[]): TimeDetailsDto[] =>
        models.map((model) => TimeDtoBuilder.buildFromModel(model)),
} as const;
