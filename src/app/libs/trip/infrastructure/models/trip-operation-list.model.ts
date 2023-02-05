import { Expose, Type } from 'class-transformer';
import { OperationModel } from 'src/app/libs/operation/infrastructure/models/operation.model';
import { TimeModel } from './time.model';
import { TripModel } from './trip.model';

export class TripOperationListModel {
    @Expose({ name: 'tripOperationListId' })
    id: string;

    @Expose()
    tripId?: string;

    @Expose()
    operationId?: string;

    @Expose()
    startTimeId?: string;

    @Expose()
    endTimeId?: string;

    @Expose()
    startStationId?: string;

    @Expose()
    endStationId?: string;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;

    @Expose()
    @Type(() => TripModel)
    trip?: TripModel;

    @Expose()
    @Type(() => OperationModel)
    operation?: OperationModel;

    @Expose()
    @Type(() => TimeModel)
    startTime?: TimeModel;

    @Expose()
    @Type(() => TimeModel)
    endTime?: TimeModel;
}
