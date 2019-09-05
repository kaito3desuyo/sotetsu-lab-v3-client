import { ReadTripDto } from '../trip/trip-dto';

/* tslint:disable: variable-name */
export class ReadOperationDto {
  id: string;
  calender_id: string;
  operation_number: string;
  created_at: string;
  updated_at: string;
  trips?: ReadTripDto[];
}
