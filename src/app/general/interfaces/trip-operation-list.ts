import { ITrip } from './trip';
import { IOperation } from './operation';
import { ITime } from './time';
import { IStation } from './station';

export interface ITripOperationList {
    id: string;
    tripId: string;
    operationId: string;
    startTimeId: string;
    endTimeId: string;
    createdAt: string;
    updatedAt: string;
    trip?: ITrip;
    operation?: IOperation;
    startStation?: IStation;
    endStation?: IStation;
    startTime?: ITime;
    endTime?: ITime;
}
