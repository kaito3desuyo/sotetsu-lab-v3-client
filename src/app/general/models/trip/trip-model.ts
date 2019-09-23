import { ReadTripDto } from './trip-dto';
import { ITrip } from '../../interfaces/trip';
import { TimeModel } from '../time/time-model';
import { TripOperationListModel } from '../trip-operation-list/trip-operation-list-model';
import { TripClassModel } from '../trip-class/trip-class-model';

export class TripModel {
  static readTripDtoImpl(trip: ReadTripDto): ITrip {
    const parsed: ITrip = {
      id: trip.id,
      serviceId: trip.service_id,
      calendarId: trip.calendar_id,
      extraCalendarId: trip.extra_calendar_id,
      // operationId: trip.operation_id,
      tripNumber: trip.trip_number,
      tripName: trip.trip_name,
      tripDirection: trip.trip_direction,
      tripClassId: trip.trip_class_id,
      tripBlockId: trip.trip_block_id,
      depotIn: trip.depot_in,
      depotOut: trip.depot_out,
      createdAt: trip.created_at,
      updatedAt: trip.updated_at
    };

    if (trip.trip_class) {
      parsed.tripClass = TripClassModel.readTripClassDtoImpl(trip.trip_class);
    }

    if (trip.trip_operation_lists) {
      parsed.tripOperationLists = trip.trip_operation_lists.map(
        tripOperationList =>
          TripOperationListModel.readTripOperationListDtoImpl(tripOperationList)
      );
    }

    if (trip.times) {
      parsed.times = trip.times.map(time => TimeModel.readTimeDtoImpl(time));
    }

    return parsed;
  }
}
