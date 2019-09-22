import { ReadTimeDto } from '../time/time-dto';
import { ReadTripOperationListDto } from '../trip-operation-list/trip-operation-list-dto';

export class ReadTripDto {
  id: string;
  service_id: string;
  trip_number: string;
  trip_class_id: string;
  trip_name: string;
  trip_direction: 0 | 1;
  trip_block_id: string;
  depot_in: boolean;
  depot_out: boolean;
  calendar_id: string;
  extra_calendar_id: string;
  created_at: string;
  updated_at: string;
  trip_operation_lists?: ReadTripOperationListDto[];
  times?: ReadTimeDto[];
}
