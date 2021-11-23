import { Expose, Type } from 'class-transformer';
import { RouteStationListDetailsDto } from 'src/app/libs/route/usecase/dtos/route-station-list-details.dto';

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
}
