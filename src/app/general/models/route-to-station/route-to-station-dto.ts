import { ReadRouteDto } from '../routes/route-dto';
import { ReadStationDto } from '../station/station-dto';
/* tslint:disable: variable-name */
export class ReadRouteToStationDto {
  id: string;
  route_id: string;
  station_id: string;
  station_sequence: number;
  station_numbering: string;
  created_at: string;
  updated_at: string;
  route?: ReadRouteDto;
  station?: ReadStationDto;
}
