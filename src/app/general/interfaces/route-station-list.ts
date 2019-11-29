import { IRoute } from './route';
import { IStation } from './station';

export interface IRouteStationList {
    id: string;
    routeId: string;
    stationId: string;
    stationSequence: number;
    stationNumbering: string;
    createdAt: string;
    updatedAt: string;
    route?: IRoute;
    station?: IStation;
}
