import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TimeDetailsDto } from './time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripOperationListDetailsDto } from './trip-operation-list-details.dto';

export interface TripDetailsDto {
    tripId: string;

    serviceId?: string;

    tripNumber?: string;

    tripClassId?: string;

    tripName?: string;

    tripDirection?: number;

    tripBlockId?: string;

    depotIn?: boolean;

    depotOut?: boolean;

    calendarId?: string;

    extraCalendarId?: string;

    createdAt?: string;

    updatedAt?: string;

    times?: TimeDetailsDto[];

    tripOperationLists?: TripOperationListDetailsDto[];

    tripClass?: TripClassDetailsDto;

    tripBlock?: TripBlockDetailsDto;
}
