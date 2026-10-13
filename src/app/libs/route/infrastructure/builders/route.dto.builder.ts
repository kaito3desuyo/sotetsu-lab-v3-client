import { RouteDetailsDto } from '../../usecase/dtos/route-details.dto';
import { RouteModel } from '../models/route.model';
import { RouteStationListDtoBuilder } from './route-station-list.dto.builder';

export const RouteDtoBuilder = {
    buildFromModel: ({
        id,
        routeStationLists,
        ...rest
    }: RouteModel): RouteDetailsDto => ({
        ...rest,
        routeId: id,
        routeStationLists:
            routeStationLists &&
            RouteStationListDtoBuilder.buildFromModels(routeStationLists),
    }),
    buildFromModels: (models: RouteModel[]): RouteDetailsDto[] =>
        models.map((model) => RouteDtoBuilder.buildFromModel(model)),
} as const;
