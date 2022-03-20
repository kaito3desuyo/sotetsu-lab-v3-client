import { RouteStationListModel } from 'src/app/libs/route/infrastructure/models/route-station-list.model';

export class StationModel {
    id: string;
    stationName?: string;
    stationSubname?: string;
    stationType?: number;
    stationDescription?: string;
    stationLatlng?: string;
    stationUrl?: string;
    wheelchairBoarding?: boolean;
    createdAt?: string;
    updatedAt?: string;
    routeStationLists?: RouteStationListModel[];
}
