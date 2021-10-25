import { ReadRouteStationListDto } from '../route-station-list/route-station-list-dto';

/* eslint-disable @typescript-eslint/naming-convention, no-underscore-dangle, id-denylist, id-match */
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
    route_station_lists?: ReadRouteStationListDto[];
}
