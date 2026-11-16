import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripDetailsDto } from './trip-details.dto';
import { TripOperationListDetailsDto } from './trip-operation-list-details.dto';
import { StopDetailsDto } from 'src/app/libs/station/usecase/dtos/stop-details.dto';

export interface TimeDetailsDto {
    timeId: string;

    tripId: string;

    stationId: string;

    stopId?: string;

    stopSequence: number;

    pickupType: number;

    dropoffType: number;

    arrivalDays: number | null;

    arrivalTime: string | null;

    departureDays: number | null;

    departureTime: string | null;

    createdAt?: string;

    updatedAt?: string;

    trip?: TripDetailsDto;

    station?: StationDetailsDto;

    stop?: StopDetailsDto;

    startTripOperationLists?: TripOperationListDetailsDto[];

    endTripOperationLists?: TripOperationListDetailsDto[];
}
