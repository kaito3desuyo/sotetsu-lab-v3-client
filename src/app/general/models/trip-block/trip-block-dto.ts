import { ReadTripDto } from '../trip/trip-dto';

/* tslint:disable: variable-name */
export class ReadTripBlockDto {
  id: string;
  created_at: string;
  updated_at: string;
  trips?: ReadTripDto[];
}
