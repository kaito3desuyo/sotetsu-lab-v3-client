import { IStation } from './station';
import { IRoute } from './route';

export interface IRouteToStation {
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
