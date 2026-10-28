import { AllKeys } from 'src/app/core/utils/all-keys';
import { StationDtoBuilder } from 'src/app/libs/station/infrastructure/builders/station.dto.builder';
import { RouteStationListDetailsDto } from '../../usecase/dtos/route-station-list-details.dto';
import { RouteStationListModel } from '../models/route-station-list.model';
import { RouteDtoBuilder } from './route.dto.builder';

export const RouteStationListDtoBuilder = {
    buildFromModel: (
        model: RouteStationListModel,
    ): RouteStationListDetailsDto => {
        const dto: AllKeys<RouteStationListDetailsDto> = {
            routeStationListId: model.id,
            routeId: model.routeId,
            stationId: model.stationId,
            stationSequence: model.stationSequence,
            stationNumbering: model.stationNumbering,
            route: model.route && RouteDtoBuilder.buildFromModel(model.route),
            station:
                model.station &&
                StationDtoBuilder.buildFromModel(model.station),
        };
        return dto;
    },
    buildFromModels: (
        models: RouteStationListModel[],
    ): RouteStationListDetailsDto[] =>
        models.map((model) => RouteStationListDtoBuilder.buildFromModel(model)),
} as const;
