import { RouteStationListDtoBuilder } from 'src/app/libs/route/infrastructure/builders/route-station-list.dto.builder';
import { TimeDtoBuilder } from 'src/app/libs/trip/infrastructure/builders/time.dto.builder';
import { StationDetailsDto } from '../../usecase/dtos/station-details.dto';
import { StationModel } from '../models/station.model';
import { StopDtoBuilder } from './stop.dto.builder';

export const StationDtoBuilder = {
    buildFromModel: ({
        id,
        routeStationLists,
        stops,
        times,
        ...rest
    }: StationModel): StationDetailsDto => ({
        ...rest,
        stationId: id,
        routeStationLists:
            routeStationLists &&
            RouteStationListDtoBuilder.buildFromModels(routeStationLists),
        stops: stops && StopDtoBuilder.buildFromModels(stops),
        times: times && TimeDtoBuilder.buildFromModels(times),
    }),
    buildFromModels: (models: StationModel[]): StationDetailsDto[] =>
        models.map((model) => StationDtoBuilder.buildFromModel(model)),
} as const;
