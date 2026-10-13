import { OperationModel } from 'src/app/libs/operation/infrastructure/models/operation.model';
import { TimeModel } from './time.model';
import { TripModel } from './trip.model';

export interface TripOperationListModel {
    id: string;
    tripId?: string;
    operationId?: string;
    startTimeId?: string;
    endTimeId?: string;
    startStationId?: string;
    endStationId?: string;
    nextTripOperationListId?: string | null;
    createdAt?: string;
    updatedAt?: string;
    trip?: TripModel;
    operation?: OperationModel;
    startTime?: TimeModel;
    endTime?: TimeModel;
}
