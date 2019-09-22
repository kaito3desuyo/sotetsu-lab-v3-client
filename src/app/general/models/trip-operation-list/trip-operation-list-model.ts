import { ReadTripOperationListDto } from './trip-operation-list-dto';
import { ITripOperationList } from '../../interfaces/trip-operation-list';
import { TripModel } from '../trip/trip-model';
import { OperationModel } from '../operation/operation-model';

export class TripOperationListModel {
  static readTripOperationListDtoImpl(
    data: ReadTripOperationListDto
  ): ITripOperationList {
    const parsed: ITripOperationList = {
      id: data.id,
      tripId: data.trip_id,
      operationId: data.operation_id,
      startTimeId: data.start_time_id,
      endTimeId: data.end_time_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    if (data.trip) {
      parsed['trip'] = TripModel.readTripDtoImpl(data.trip);
    }
    if (data.operation) {
      parsed['operation'] = OperationModel.readOperationDtoImpl(data.operation);
    }

    return parsed;
  }
}
