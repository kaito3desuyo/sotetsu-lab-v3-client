import { ReadTripDto, CreateTripDto } from '../trip/trip-dto';

/* tslint:disable: variable-name */
export class ReadTripBlockDto {
  id: string;
  created_at: string;
  updated_at: string;
  trips?: ReadTripDto[];
}

export class CreateTripBlockDto {
  trips: CreateTripDto[];
}

export class UpdateTripBlockDto {
  trips: CreateTripDto[];
}
