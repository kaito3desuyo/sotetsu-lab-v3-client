import { RouteStationListModel } from './route-station-list.model';

export interface RouteModel {
    id: string;
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
    routeStationLists?: RouteStationListModel[];
}
