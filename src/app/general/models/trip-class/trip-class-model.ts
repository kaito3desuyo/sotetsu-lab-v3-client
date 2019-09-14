import { ITripClass } from '../../interfaces/trip-class';
import { ReadTripClassDto } from './trip-class-dto';

export class TripClassModel {
  static readTripClassDtoImpl(tripClass: ReadTripClassDto): ITripClass {
    const parsed: ITripClass = {
      id: tripClass.id,
      serviceId: tripClass.service_id,
      tripClassName: tripClass.trip_class_name,
      tripClassColor: tripClass.trip_class_color,
      sequence: tripClass.sequence,
      createdAt: tripClass.created_at,
      updatedAt: tripClass.updated_at
    };

    return parsed;
  }
}
