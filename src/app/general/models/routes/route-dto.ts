import { ReadRouteToStationDto } from '../route-to-station/route-to-station-dto';

/* tslint:disable: variable-name */
export class ReadRouteDto {
  id: string;
  agency_id: string;
  route_number: string;
  route_name: string;
  route_nickname: string;
  route_description: string;
  route_type: number;
  route_url: string;
  route_color: string;
  route_text_color: string;
  created_at: string;
  updated_at: string;
  route_to_stations?: ReadRouteToStationDto[];
}
