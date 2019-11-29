import { ReadFormationDto } from '../formation/formation-dto';
import { ReadVehicleDto } from '../vehicle/vehicle-dto';
/* tslint:disable: variable-name*/
export class ReadFormationToVehicleDto {
    id: string;
    formation_id: string;
    vehicle_id: string;
    car_number: number;
    created_at: string;
    updated_at: string;
    formation?: ReadFormationDto;
    vehicle?: ReadVehicleDto;
}
