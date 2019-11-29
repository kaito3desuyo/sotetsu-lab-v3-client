import { ITripOperationList } from './trip-operation-list';

export interface IOperation {
    id: string;
    calendarId: string;
    operationNumber: string;
    createdAt: string;
    updatedAt: string;
    tripOperationLists?: ITripOperationList[];
}
