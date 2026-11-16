import { RouteStationListDetailsDto } from './route-station-list-details.dto';

export interface RouteDetailsDto {
    routeId: string;

    agencyId: string;

    routeNumber: string | null;

    routeName: string;

    routeNickName: string | null;

    routeDescription: string | null;

    routeType: number;

    routeUrl: string | null;

    routeColor: string | null;

    routeTextColor: string | null;

    createdAt: string;

    updatedAt: string;

    routeStationLists?: RouteStationListDetailsDto[];
}
