import { ITrip } from './trip';

export interface IOperation {
  id: string;
  calenderId: string;
  operationNumber: string;
  createdAt: string;
  updatedAt: string;
  trips?: ITrip[];
}
