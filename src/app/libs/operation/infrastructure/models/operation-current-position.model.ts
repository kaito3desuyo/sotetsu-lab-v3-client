import { TripOperationListModel } from 'src/app/libs/trip/infrastructure/models/trip-operation-list.model';
import { OperationModel } from './operation.model';

export interface OperationCurrentPositionModel {
    operation: OperationModel;
    position: {
        prev: TripOperationListModel;
        current: TripOperationListModel;
        next: TripOperationListModel;
    };
}
