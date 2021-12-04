import { Expose, Type } from 'class-transformer';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripDetailsDto } from './trip-details.dto';
import { TripOperationListDetailsDto } from './trip-operation-list-details.dto';

export class TimeDetailsDto {
    @Expose({ name: 'id' })
    timeId: string;

    @Expose()
    tripId?: string;

    @Expose()
    stationId?: string;

    @Expose()
    stopId?: string;

    @Expose()
    stopSequence?: number;

    @Expose()
    pickupType?: number;

    @Expose()
    dropoffType?: number;

    @Expose()
    arrivalDays?: number;

    @Expose()
    arrivalTime?: string;

    @Expose()
    departureDays?: number;

    @Expose()
    departureTime?: string;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;

    @Expose()
    @Type(() => TripDetailsDto)
    trip?: TripDetailsDto;

    @Expose()
    @Type(() => StationDetailsDto)
    station?: StationDetailsDto;

    @Expose()
    stop?: any;

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    startTripOperationLists?: TripOperationListDetailsDto[];

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    endTripOperationLists?: TripOperationListDetailsDto[];
}
