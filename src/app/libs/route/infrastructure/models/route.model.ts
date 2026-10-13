import { RouteStationListModel } from './route-station-list.model';

export interface RouteModel {
    id: string;
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
    routeStationLists?: RouteStationListModel[];
}
