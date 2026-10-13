import { RouteStationListDetailsDto } from './route-station-list-details.dto';

export interface RouteDetailsDto {
    routeId: string;

    agencyId?: string;

    routeNumber?: string;

    routeName?: string;

    routeNickName?: string;

    routeDescription?: string;

    routeType?: number;

    routeUrl?: string;

    routeColor?: string;

    routeTextColor?: string;

    createdAt?: string;

    updatedAt?: string;

    routeStationLists?: RouteStationListDetailsDto[];
}
