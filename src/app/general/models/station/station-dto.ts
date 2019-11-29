import { ReadRouteStationListDto } from '../route-station-list/route-station-list-dto';
import { ReadStopDto } from '../stop/stop-dto';
/* tslint:disable: variable-name */
export class ReadStationDto {
    id: string;
    station_name: string;
    station_subname: string;
    station_type: number;
    station_description: string;
    station_latlng: any;
    station_url: string;
    wheelchair_boarding: boolean;
    created_at: string;
    updated_at: string;
    route_station_lists?: ReadRouteStationListDto[];
    stops?: ReadStopDto[];
}
