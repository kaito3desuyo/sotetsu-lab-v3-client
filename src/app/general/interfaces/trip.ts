import { ITime } from './time';

export interface ITrip {
  id: string;
  serviceId: string;
  calenderId: string;
  extraCalenderId: string;
  operationId: string;
  tripNumber: string;
  tripName: string;
  tripDirection: number;
  tripClassId: string;
  tripBlockId: string;
  depotIn: boolean;
  depotOut: boolean;
  createdAt: string;
  updatedAt: string;
  times?: ITime[];
}
