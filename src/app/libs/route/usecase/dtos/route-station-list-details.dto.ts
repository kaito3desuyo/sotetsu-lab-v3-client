import { Expose, Type } from 'class-transformer';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { RouteDetailsDto } from './route-details.dto';
import 'reflect-metadata';

export class RouteStationListDetailsDto {
    @Expose({ name: 'id' })
    routeStationListId: string;

    @Expose()
    routeId?: string;

    @Expose()
    stationId?: string;

    @Expose()
    stationSequence?: number;

    @Expose()
    stationNumbering?: string;

    @Expose()
    @Type(() => RouteDetailsDto)
    route?: RouteDetailsDto;

    @Expose()
    @Type(() => StationDetailsDto)
    station?: StationDetailsDto;
}
