import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { TimeDetailsDto } from './time-details.dto';
import { TripDetailsDto } from './trip-details.dto';

export interface TripOperationListDetailsDto {
    tripOperationListId: string;

    tripId?: string;

    operationId?: string;

    startTimeId?: string;

    endTimeId?: string;

    startStationId?: string;

    endStationId?: string;

    nextTripOperationListId?: string | null;

    createdAt?: string;

    updatedAt?: string;

    trip?: TripDetailsDto;

    operation?: OperationDetailsDto;

    startTime?: TimeDetailsDto;

    endTime?: TimeDetailsDto;
}
