import { ReadFormationToVehicleDto } from '../formation-to-vehicle/formation-to-vehicle-dto';

/* eslint-disable @typescript-eslint/naming-convention, no-underscore-dangle, id-denylist, id-match */
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
