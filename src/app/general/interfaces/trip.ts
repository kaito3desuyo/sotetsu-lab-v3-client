import { ITime } from './time';
import { ITripOperationList } from './trip-operation-list';
import { ITripClass } from './trip-class';
import { ITripBlock } from '../models/trip-block/trip-block';

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
  tripBlock?: ITripBlock;
  tripClass?: ITripClass;
  tripOperationLists?: ITripOperationList[];
  times?: ITime[];
}
