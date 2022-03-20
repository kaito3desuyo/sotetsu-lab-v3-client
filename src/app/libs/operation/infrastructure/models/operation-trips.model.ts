import { TripOperationListModel } from 'src/app/libs/trip/infrastructure/models/trip-operation-list.model';
import { OperationModel } from './operation.model';

export interface OperationTripsModel {
    operation: OperationModel;
    trips: TripOperationListModel[];
}
