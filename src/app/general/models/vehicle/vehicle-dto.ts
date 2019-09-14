import { ReadFormationToVehicleDto } from '../formation-to-vehicle/formation-to-vehicle-dto';

/* tslint:disable: variable-name */
export class ReadVehicleDto {
  id: string;
  vehicle_number: string;
  belongs: string;
  production_date: string;
  scrapped_date: string;
  created_at: string;
  updated_at: string;
  vehicle_to_formations?: ReadFormationToVehicleDto[];
}
