import { ITrip } from './trip';

export interface IOperation {
  id: string;
  calendarId: string;
  operationNumber: string;
  createdAt: string;
  updatedAt: string;
  trips?: ITrip[];
}
