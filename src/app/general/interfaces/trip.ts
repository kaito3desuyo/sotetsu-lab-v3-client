import { ITime } from './time';
import { ITripOperationList } from './trip-operation-list';
import { ITripClass } from './trip-class';

export interface ITrip {
  id: string;
  serviceId: string;
  calendarId: string;
  extraCalendarId: string;
  tripNumber: string;
  tripName: string;
  tripDirection: number;
  tripClassId: string;
  tripBlockId: string;
  depotIn: boolean;
  depotOut: boolean;
  createdAt: string;
  updatedAt: string;
  tripClass?: ITripClass;
  tripOperationLists?: ITripOperationList[];
  times?: ITime[];
}
