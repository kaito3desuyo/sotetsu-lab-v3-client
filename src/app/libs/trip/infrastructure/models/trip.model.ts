import { TripBlockModel } from 'src/app/libs/trip-block/infrastructure/models/trip-block.model';
import { TripClassModel } from 'src/app/libs/trip-class/infrastructure/models/trip-class.model';
import { TimeModel } from './time.model';
import { TripOperationListModel } from './trip-operation-list.model';

export interface TripModel {
    id: string;
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
    times?: TimeModel[];
    tripOperationLists?: TripOperationListModel[];
    tripClass?: TripClassModel;
    tripBlock?: TripBlockModel;
}
