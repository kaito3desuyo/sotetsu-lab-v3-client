import { ReadTripDto } from '../trip/trip-dto';
import { ReadOperationDto } from '../operation/operation-dto';
import { ReadTimeDto } from '../time/time-dto';

export class ReadTripOperationListDto {
  id: string;
  trip_id: string;
  operation_id: string;
  start_time_id: string;
  end_time_id: string;
  created_at: string;
  updated_at: string;
  trip?: ReadTripDto;
  operation?: ReadOperationDto;
  start_time?: ReadTimeDto;
  end_time?: ReadTimeDto;
}
