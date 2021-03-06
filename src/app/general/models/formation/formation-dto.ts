import { ReadFormationToVehicleDto } from '../formation-to-vehicle/formation-to-vehicle-dto';

/* tslint:disable: variable-name*/
export class ReadFormationDto {
    id: string;
    agency_id: string;
    vehicle_type: string;
    formation_number: string;
    formation_description: string;
    start_date: string;
    end_date: string;
    created_at: string;
    updated_at: string;
    formation_to_vehicles?: ReadFormationToVehicleDto[];
}
