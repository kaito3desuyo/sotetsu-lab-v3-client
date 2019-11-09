import { ReadTimeDto } from './time-dto';
import { ITime } from '../../interfaces/time';
import { TripModel } from '../trip/trip-model';
import { StationModel } from '../station/station-model';

export class TimeModel {
  static readTimeDtoImpl(data: ReadTimeDto): ITime {
    const parsed: ITime = {
      id: data.id,
      tripId: data.trip_id,
      stationId: data.station_id,
      stopId: data.stop_id,
      stopSequence: data.stop_sequence,
      pickupType: data.pickup_type,
      dropoffType: data.dropoff_type,
      arrivalDays: data.arrival_days,
      arrivalTime: data.arrival_time,
      departureDays: data.departure_days,
      departureTime: data.departure_time,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    if (data.trip) {
      parsed.trip = TripModel.readTripDtoImpl(data.trip);
    }

    if (data.station) {
      parsed.station = StationModel.readStationDtoImpl(data.station);
    }

    return parsed;
  }
}
