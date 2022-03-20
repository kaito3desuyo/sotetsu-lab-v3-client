import { TimeModel } from './time.model';
import { TripOperationListModel } from './trip-operation-list.model';

export class TripModel {
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
}
