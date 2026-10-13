import { RouteDtoBuilder } from 'src/app/libs/route/infrastructure/builders/route.dto.builder';
import { ServiceRoutesDto } from '../../usecase/dtos/service-routes.dto';
import { ServiceRoutesModel } from '../models/service-routes.model';
import { ServiceDtoBuilder } from './service.dto.builder';

export const ServiceRoutesDtoBuilder = {
    buildFromModel: ({
        service,
        routes,
        ...rest
    }: ServiceRoutesModel): ServiceRoutesDto => ({
        ...rest,
        service: service && ServiceDtoBuilder.buildFromModel(service),
        routes:
            routes &&
            routes.map((route) => ({
                ...RouteDtoBuilder.buildFromModel(route),
                sequence: route.sequence,
                startRouteStationListId: route.startRouteStationListId,
                endRouteStationListId: route.endRouteStationListId,
            })),
    }),
    buildFromModels: (models: ServiceRoutesModel[]): ServiceRoutesDto[] =>
        models.map((model) => ServiceRoutesDtoBuilder.buildFromModel(model)),
} as const;
