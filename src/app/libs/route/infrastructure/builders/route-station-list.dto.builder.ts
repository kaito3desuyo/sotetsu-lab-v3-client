import { StationDtoBuilder } from 'src/app/libs/station/infrastructure/builders/station.dto.builder';
import { RouteStationListDetailsDto } from '../../usecase/dtos/route-station-list-details.dto';
import { RouteStationListModel } from '../models/route-station-list.model';
import { RouteDtoBuilder } from './route.dto.builder';

export const RouteStationListDtoBuilder = {
    buildFromModel: ({
        id,
        route,
        station,
        ...rest
    }: RouteStationListModel): RouteStationListDetailsDto => ({
        ...rest,
        routeStationListId: id,
        route: route && RouteDtoBuilder.buildFromModel(route),
        station: station && StationDtoBuilder.buildFromModel(station),
    }),
    buildFromModels: (
        models: RouteStationListModel[],
    ): RouteStationListDetailsDto[] =>
        models.map((model) => RouteStationListDtoBuilder.buildFromModel(model)),
} as const;
