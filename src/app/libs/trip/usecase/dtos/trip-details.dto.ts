import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TimeDetailsDto } from './time-details.dto';
import {
    TripBlockDetailsDto,
    TripBlockWithTripsDto,
} from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripOperationListDetailsDto } from './trip-operation-list-details.dto';

export interface TripDetailsDto {
    tripId: string;

    serviceId: string;

    tripNumber: string;

    tripClassId: string;

    tripName: string | null;

    tripDirection: number;

    tripBlockId: string;

    depotIn: boolean;

    depotOut: boolean;

    calendarId: string | null;

    extraCalendarId?: string;

    createdAt: string;

    updatedAt: string;

    times?: TimeDetailsDto[];

    tripOperationLists?: TripOperationListDetailsDto[];

    tripClass?: TripClassDetailsDto;

    tripBlock?: TripBlockDetailsDto;
}

/** 時刻表の取得で times を付けて取った列車。API が必ず付ける */
export interface TripWithTimesDto extends TripDetailsDto {
    times: TimeDetailsDto[];
    tripBlock?: TripBlockWithTripsDto;
}
