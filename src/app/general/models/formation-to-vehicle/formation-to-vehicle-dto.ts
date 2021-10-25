import { ReadFormationDto } from '../formation/formation-dto';
import { ReadVehicleDto } from '../vehicle/vehicle-dto';
/* eslint-disable @typescript-eslint/naming-convention, no-underscore-dangle, id-denylist, id-match */
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
