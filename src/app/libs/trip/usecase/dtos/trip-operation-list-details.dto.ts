import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { TimeDetailsDto } from './time-details.dto';
import { TripDetailsDto } from './trip-details.dto';

export interface TripOperationListDetailsDto {
    tripOperationListId: string;

    tripId: string;

    operationId: string;

    startTimeId: string | null;

    endTimeId: string | null;

    startStationId: string | null;

    endStationId: string | null;

    nextTripOperationListId?: string | null;

    createdAt: string;

    updatedAt: string;

    trip?: TripDetailsDto;

    operation?: OperationDetailsDto;

    startTime?: TimeDetailsDto;

    endTime?: TimeDetailsDto;
}

/** 運用の行程（include で trip・startTime・endTime を付けて取った区間）。API が必ず付ける */
export type TripOperationListWithTimesDto = TripOperationListDetailsDto & {
    trip: TripDetailsDto;
    startTime: TimeDetailsDto;
    endTime: TimeDetailsDto;
};
