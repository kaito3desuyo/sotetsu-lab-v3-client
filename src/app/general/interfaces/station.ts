import { IRouteStationList } from './route-station-list';
import { IStop } from '../models/stop/stop';

export interface IStation {
    id: string;
    stationName: string;
    stationSubName: string;
    stationType: number;
    stationDescription: string;
    stationLatLng: any;
    stationUrl: string;
    wheelchairBoarding: boolean;
    createdAt: string;
    updatedAt: string;
    routeStationLists?: IRouteStationList[];
    stops?: IStop[];
}
