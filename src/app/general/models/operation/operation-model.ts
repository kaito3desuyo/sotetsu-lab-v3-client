import { ReadOperationDto } from './operation-dto';
import { IOperation } from '../../interfaces/operation';
import { TripModel } from '../trip/trip-model';
import { TripOperationListModel } from '../trip-operation-list/trip-operation-list-model';

export class OperationModel {
  static readOperationDtoImpl(operation: ReadOperationDto): IOperation {
    const returnObj: IOperation = {
      id: operation.id,
      calendarId: operation.calendar_id,
      operationNumber: operation.operation_number,
      createdAt: operation.created_at,
      updatedAt: operation.updated_at
    };

    if (operation.trip_operation_lists) {
      returnObj.tripOperationLists = operation.trip_operation_lists.map(
        data => {
          return TripOperationListModel.readTripOperationListDtoImpl(data);
        }
      );
    }

    return returnObj;
  }
}
