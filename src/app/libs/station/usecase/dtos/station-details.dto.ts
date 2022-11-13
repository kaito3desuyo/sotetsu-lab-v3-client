import { Expose, Type } from 'class-transformer';
import { RouteStationListDetailsDto } from 'src/app/libs/route/usecase/dtos/route-station-list-details.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { StopDetailsDto } from './stop-details.dto';

export class StationDetailsDto {
    @Expose({ name: 'id' })
    stationId: string;

    @Expose()
    stationName: string;

    @Expose()
    stationSubname: string;

    @Expose()
    stationType: number;

    @Expose()
    stationDescription: string;

    @Expose()
    stationLatlng: string;

    @Expose()
    stationUrl: string;

    @Expose()
    wheelchairBoarding: boolean;

    @Expose()
    createdAt: string;

    @Expose()
    updatedAt: string;

    @Expose()
    @Type(() => RouteStationListDetailsDto)
    routeStationLists?: RouteStationListDetailsDto[];

    @Expose()
    @Type(() => StopDetailsDto)
    stops?: StopDetailsDto[];

    @Expose()
    @Type(() => TimeDetailsDto)
    times?: TimeDetailsDto[];
}
