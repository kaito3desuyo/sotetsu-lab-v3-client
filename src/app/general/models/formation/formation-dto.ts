import { ReadFormationToVehicleDto } from '../formation-to-vehicle/formation-to-vehicle-dto';

/* eslint-disable @typescript-eslint/naming-convention, no-underscore-dangle, id-denylist, id-match */
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
