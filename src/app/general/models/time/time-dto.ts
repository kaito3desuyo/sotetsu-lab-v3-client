import { ReadTripDto } from '../trip/trip-dto';
import { ReadStationDto } from '../station/station-dto';
import { ReadStopDto } from '../stop/stop-dto';

export class ReadTimeDto {
  id: string;
  trip_id: string;
  station_id: string;
  stop_id: string;
  stop_sequence: number;
  pickup_type: number;
  dropoff_type: number;
  arrival_days: number;
  arrival_time: string;
  departure_days: number;
  departure_time: string;
  created_at: string;
  updated_at: string;
  trip?: ReadTripDto;
  station?: ReadStationDto;
  stop?: ReadStopDto;
}

export class CreateTimeDto {
  trip_id?: string;
  station_id: string;
  stop_id: string;
  stop_sequence: number;
  pickup_type: number;
  dropoff_type: number;
  arrival_days: number;
  arrival_time: string;
  departure_days: number;
  departure_time: string;
}

export class UpdateTimeDto {
  id?: string;
  trip_id?: string;
  station_id: string;
  stop_id: string;
  stop_sequence: number;
  pickup_type: number;
  dropoff_type: number;
  arrival_days: number;
  arrival_time: string;
  departure_days: number;
  departure_time: string;
}
