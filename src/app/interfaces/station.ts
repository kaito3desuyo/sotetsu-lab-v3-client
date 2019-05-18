import { Stop } from './stop';
import { RouteStationList } from './route_station_list';

export interface Station {
  id: string;
  station_name: string;
  station_subname: string;
  station_type: number;
  station_description: string;
  station_latlng: string;
  station_url: string;
  wheelchair_boarding: boolean;
  created_at: string;
  updated_at: string;
  stops?: Stop[];
  route_station_lists?: RouteStationList[];
}
