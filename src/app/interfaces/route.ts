import { RouteStationList } from './route_station_list';
import { Agency } from './agency';

export interface Route {
  id: string;
  agency_id: string;
  route_number: number;
  route_name: string;
  route_nickname: string;
  route_description: string;
  route_type: number;
  route_url: string;
  route_color: string;
  route_text_color: string;
  created_at: string;
  updated_at: string;
  route_station_lists?: RouteStationList[];
  agency?: Agency;
}
