import { StationModel } from 'src/app/libs/station/infrastructure/models/station.model';
import { StopModel } from 'src/app/libs/station/infrastructure/models/stop.model';
import { TripOperationListModel } from './trip-operation-list.model';
import { TripModel } from './trip.model';

export interface TimeModel {
    id: string;
    tripId?: string;
    stationId?: string;
    stopId?: string;
    stopSequence?: number;
    pickupType?: number;
    dropoffType?: number;
    arrivalDays?: number;
    arrivalTime?: string;
    departureDays?: number;
    departureTime?: string;
    createdAt?: string;
    updatedAt?: string;
    trip?: TripModel;
    station?: StationModel;
    stop?: StopModel;
    startTripOperationLists?: TripOperationListModel[];
    endTripOperationLists?: TripOperationListModel[];
}
