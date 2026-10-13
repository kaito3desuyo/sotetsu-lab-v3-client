import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripDetailsDto } from './trip-details.dto';
import { TripOperationListDetailsDto } from './trip-operation-list-details.dto';
import { StopDetailsDto } from 'src/app/libs/station/usecase/dtos/stop-details.dto';

export interface TimeDetailsDto {
    timeId: string;

    tripId?: string;

    stationId?: string;

    stopId?: string;

    stopSequence?: number;

    pickupType?: number;

    dropoffType?: number;

    arrivalDays?: number;

    arrivalTime?: string;

    departureDays?: number;

    departureTime?: string;

    createdAt?: string;

    updatedAt?: string;

    trip?: TripDetailsDto;

    station?: StationDetailsDto;

    stop?: StopDetailsDto;

    startTripOperationLists?: TripOperationListDetailsDto[];

    endTripOperationLists?: TripOperationListDetailsDto[];
}
