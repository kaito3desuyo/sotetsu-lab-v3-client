import { Expose, Type } from 'class-transformer';
import { StationModel } from 'src/app/libs/station/infrastructure/models/station.model';
import { StopModel } from 'src/app/libs/station/infrastructure/models/stop.model';
import { TripOperationListModel } from './trip-operation-list.model';
import { TripModel } from './trip.model';

export class TimeModel {
    @Expose({ name: 'timeId' })
    id: string;

    @Expose()
    tripId?: string;

    @Expose()
    stationId?: string;

    @Expose()
    stopId?: string;

    @Expose()
    stopSequence?: number;

    @Expose()
    pickupType?: number;

    @Expose()
    dropoffType?: number;

    @Expose()
    arrivalDays?: number;

    @Expose()
    arrivalTime?: string;

    @Expose()
    departureDays?: number;

    @Expose()
    departureTime?: string;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;

    @Expose()
    @Type(() => TripModel)
    trip?: TripModel;

    @Expose()
    station?: StationModel;

    @Expose()
    stop?: StopModel;

    @Expose()
    @Type(() => TripOperationListModel)
    startTripOperationLists?: TripOperationListModel[];

    @Expose()
    @Type(() => TripOperationListModel)
    endTripOperationLists?: TripOperationListModel[];
}
