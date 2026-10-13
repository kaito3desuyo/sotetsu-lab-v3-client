import { StationModel } from 'src/app/libs/station/infrastructure/models/station.model';
import { RouteModel } from './route.model';

export interface RouteStationsModel {
    route: RouteModel;
    stations: RouteStationModel[];
}

export interface RouteStationModel extends StationModel {
    stationSequence: number;
    stationNumbering: string;
}
