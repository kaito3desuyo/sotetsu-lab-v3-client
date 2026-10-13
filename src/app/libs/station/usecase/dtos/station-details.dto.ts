import { RouteStationListDetailsDto } from 'src/app/libs/route/usecase/dtos/route-station-list-details.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { StopDetailsDto } from './stop-details.dto';

export interface StationDetailsDto {
    stationId: string;

    stationName: string;

    stationSubname: string;

    stationType: number;

    stationDescription: string;

    stationLatlng: string;

    stationUrl: string;

    wheelchairBoarding: boolean;

    createdAt: string;

    updatedAt: string;

    routeStationLists?: RouteStationListDetailsDto[];

    stops?: StopDetailsDto[];

    times?: TimeDetailsDto[];
}
