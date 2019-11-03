import { ReadTimeDto, CreateTimeDto, UpdateTimeDto } from '../time/time-dto';
import {
  ReadTripOperationListDto,
  CreateTripOperationListDto,
  UpdateTripOperationListDto
} from '../trip-operation-list/trip-operation-list-dto';
import { ReadTripClassDto } from '../trip-class/trip-class-dto';
import { ReadTripBlockDto } from '../trip-block/trip-block-dto';

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
  trip_block?: ReadTripBlockDto;
  trip_class?: ReadTripClassDto;
  trip_operation_lists?: ReadTripOperationListDto[];
  times?: ReadTimeDto[];
}

export class CreateTripDto {
  service_id: string;
  trip_number: string;
  trip_class_id: string;
  trip_name: string;
  trip_direction: 0 | 1;
  depot_in: boolean;
  depot_out: boolean;
  calendar_id: string;
  extra_calendar_id: string;
  times?: CreateTimeDto[];
  trip_operation_lists?: CreateTripOperationListDto[];
}

export class UpdateTripDto {
  id: string;
  service_id: string;
  trip_number: string;
  trip_class_id: string;
  trip_name: string;
  trip_direction: 0 | 1;
  depot_in: boolean;
  depot_out: boolean;
  calendar_id: string;
  extra_calendar_id: string;
  times?: UpdateTimeDto[];
  trip_operation_lists?: UpdateTripOperationListDto[];
}
