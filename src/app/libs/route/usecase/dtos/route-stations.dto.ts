import { Expose, Type } from 'class-transformer';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { RouteDetailsDto } from './route-details.dto';

export class RouteStationsDto {
    @Expose()
    @Type(() => RouteDetailsDto)
    route: RouteDetailsDto;

    @Expose()
    @Type(() => RouteStationDto)
    stations: RouteStationDto[];
}

export class RouteStationDto extends StationDetailsDto {
    @Expose()
    stationSequence: number;

    @Expose()
    stationNumbering: string;
}
