import { RouteStationListModel } from 'src/app/libs/route/infrastructure/models/route-station-list.model';
import { TimeModel } from 'src/app/libs/trip/infrastructure/models/time.model';
import { StopModel } from './stop.model';

export interface StationModel {
    id: string;
    stationName: string;
    stationSubname: string | null;
    stationType: number;
    stationDescription: string | null;
    stationLatlng: string | null;
    stationUrl: string | null;
    wheelchairBoarding: boolean;
    createdAt: string;
    updatedAt: string;
    routeStationLists?: RouteStationListModel[];
    stops?: StopModel[];
    times?: TimeModel[];
}
