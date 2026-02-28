import { StationModel } from 'src/app/libs/station/infrastructure/models/station.model';
import { RouteModel } from './route.model';

export class RouteStationsModel {
    route: RouteModel;
    stations: RouteStationModel[];
}

export class RouteStationModel extends StationModel {
    stationSequence: number;
    stationNumbering: string;
}
