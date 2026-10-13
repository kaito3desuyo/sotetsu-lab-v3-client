import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { RouteDetailsDto } from './route-details.dto';

export interface RouteStationListDetailsDto {
    routeStationListId: string;

    routeId?: string;

    stationId?: string;

    stationSequence?: number;

    stationNumbering?: string;

    route?: RouteDetailsDto;

    station?: StationDetailsDto;
}
