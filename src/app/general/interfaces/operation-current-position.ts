import { ITripOperationList } from './trip-operation-list';

export interface IOperationCurrentPosition {
    id: string;
    operationNumber: string;
    currentPosition: {
        prev: ITripOperationList | null;
        current: ITripOperationList | null;
        next: ITripOperationList | null;
    };
}
