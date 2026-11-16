import { StationModel } from 'src/app/libs/station/infrastructure/models/station.model';
import { RouteModel } from './route.model';

export interface RouteStationListModel {
    id: string;
    routeId: string;
    stationId: string;
    stationSequence: number;
    stationNumbering: string | null;
    route?: RouteModel;
    station?: StationModel;
}
