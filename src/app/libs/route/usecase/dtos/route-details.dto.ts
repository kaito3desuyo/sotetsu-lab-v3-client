import { Expose, Type } from 'class-transformer';
import { RouteStationListDetailsDto } from './route-station-list-details.dto';

export class RouteDetailsDto {
    @Expose({ name: 'id' })
    routeId: string;

    @Expose()
    agencyId?: string;

    @Expose()
    routeNumber?: string;

    @Expose()
    routeName?: string;

    @Expose()
    routeNickName?: string;

    @Expose()
    routeDescription?: string;

    @Expose()
    routeType?: number;

    @Expose()
    routeUrl?: string;

    @Expose()
    routeColor?: string;

    @Expose()
    routeTextColor?: string;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;

    @Expose()
    @Type(() => RouteStationListDetailsDto)
    routeStationLists?: RouteStationListDetailsDto[];
}
