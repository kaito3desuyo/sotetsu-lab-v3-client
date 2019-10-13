import { Route } from './route';
import { Station } from './station';

export interface RouteStationList {
  id: string;
  route_id: string;
  station_id: string;
  station_sequence: number;
  station_numbering: string;
  created_at: string;
  updated_at: string;
  route?: Route;
  station?: Station;
}
