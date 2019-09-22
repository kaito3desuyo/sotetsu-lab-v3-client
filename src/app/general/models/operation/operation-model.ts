import { ReadOperationDto } from './operation-dto';
import { IOperation } from '../../interfaces/operation';
import { TripModel } from '../trip/trip-model';

export class OperationModel {
  static readOperationDtoImpl(operation: ReadOperationDto): IOperation {
    const returnObj: IOperation = {
      id: operation.id,
      calendarId: operation.calendar_id,
      operationNumber: operation.operation_number,
      createdAt: operation.created_at,
      updatedAt: operation.updated_at
    };

    if (operation.trips) {
      returnObj.trips = operation.trips.map(data => {
        return TripModel.readTripDtoImpl(data);
      });
    }

    return returnObj;
  }
}
