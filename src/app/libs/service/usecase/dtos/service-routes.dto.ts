import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { ServiceDetailsDto } from './service-details.dto';

export interface ServiceRoutesDto {
    service: ServiceDetailsDto;

    routes: ServiceRouteDto[];
}

export interface ServiceRouteDto extends RouteDetailsDto {
    sequence: number;

    startRouteStationListId: string;

    endRouteStationListId: string;
}
