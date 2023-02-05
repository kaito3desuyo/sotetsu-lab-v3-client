import { Expose, Type } from 'class-transformer';
import { TimeModel } from './time.model';
import { TripOperationListModel } from './trip-operation-list.model';

export class TripModel {
    @Expose({ name: 'tripId' })
    id: string;

    @Expose()
    serviceId?: string;

    @Expose()
    tripNumber?: string;

    @Expose()
    tripClassId?: string;

    @Expose()
    tripName?: string;

    @Expose()
    tripDirection?: number;

    @Expose()
    tripBlockId?: string;

    @Expose()
    depotIn?: boolean;

    @Expose()
    depotOut?: boolean;

    @Expose()
    calendarId?: string;

    @Expose()
    extraCalendarId?: string;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;

    @Expose()
    @Type(() => TimeModel)
    times?: TimeModel[];

    @Expose()
    @Type(() => TripOperationListModel)
    tripOperationLists?: TripOperationListModel[];
}
