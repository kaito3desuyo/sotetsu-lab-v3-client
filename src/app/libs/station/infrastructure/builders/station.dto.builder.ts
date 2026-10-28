import { AllKeys } from 'src/app/core/utils/all-keys';
import { RouteStationListDtoBuilder } from 'src/app/libs/route/infrastructure/builders/route-station-list.dto.builder';
import { TimeDtoBuilder } from 'src/app/libs/trip/infrastructure/builders/time.dto.builder';
import { StationDetailsDto } from '../../usecase/dtos/station-details.dto';
import { StationModel } from '../models/station.model';
import { StopDtoBuilder } from './stop.dto.builder';

export const StationDtoBuilder = {
    buildFromModel: (model: StationModel): StationDetailsDto => {
        const dto: AllKeys<StationDetailsDto> = {
            stationId: model.id,
            stationName: model.stationName,
            stationSubname: model.stationSubname,
            stationType: model.stationType,
            stationDescription: model.stationDescription,
            stationLatlng: model.stationLatlng,
            stationUrl: model.stationUrl,
            wheelchairBoarding: model.wheelchairBoarding,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt,
            routeStationLists:
                model.routeStationLists &&
                RouteStationListDtoBuilder.buildFromModels(
                    model.routeStationLists,
                ),
            stops: model.stops && StopDtoBuilder.buildFromModels(model.stops),
            times: model.times && TimeDtoBuilder.buildFromModels(model.times),
        };
        return dto;
    },
    buildFromModels: (models: StationModel[]): StationDetailsDto[] =>
        models.map((model) => StationDtoBuilder.buildFromModel(model)),
} as const;
