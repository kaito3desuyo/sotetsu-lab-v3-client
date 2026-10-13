import { StationDtoBuilder } from 'src/app/libs/station/infrastructure/builders/station.dto.builder';
import { RouteStationsDto } from '../../usecase/dtos/route-stations.dto';
import { RouteStationsModel } from '../models/route-stations.model';
import { RouteDtoBuilder } from './route.dto.builder';

export const RouteStationsDtoBuilder = {
    buildFromModel: ({
        route,
        stations,
        ...rest
    }: RouteStationsModel): RouteStationsDto => ({
        ...rest,
        route: route && RouteDtoBuilder.buildFromModel(route),
        stations:
            stations &&
            stations.map((station) => ({
                ...StationDtoBuilder.buildFromModel(station),
                stationSequence: station.stationSequence,
                stationNumbering: station.stationNumbering,
            })),
    }),
    buildFromModels: (models: RouteStationsModel[]): RouteStationsDto[] =>
        models.map((model) => RouteStationsDtoBuilder.buildFromModel(model)),
} as const;
