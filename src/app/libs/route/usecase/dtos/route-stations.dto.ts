import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { RouteDetailsDto } from './route-details.dto';

export interface RouteStationsDto {
    route: RouteDetailsDto;

    stations: RouteStationDto[];
}

export interface RouteStationDto extends StationDetailsDto {
    stationSequence: number;

    stationNumbering: string;
}
