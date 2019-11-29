import { ReadVehicleDto } from './vehicle-dto';
import { IVehicle } from '../../interfaces/vehicle';
import { FormationToVehicleModel } from '../formation-to-vehicle/formation-to-vehicle-model';

export class VehicleModel {
    static readVehicleDtoImpl(vehicle: ReadVehicleDto): IVehicle {
        const returnObj: IVehicle = {
            id: vehicle.id,
            vehicleNumber: vehicle.vehicle_number,
            belongs: vehicle.belongs,
            productionDate: vehicle.production_date,
            scrappedDate: vehicle.scrapped_date,
            createdAt: vehicle.created_at,
            updatedAt: vehicle.updated_at
        };

        if (vehicle.vehicle_to_formations) {
            returnObj.vehicleToFormations = vehicle.vehicle_to_formations.map(
                data =>
                    FormationToVehicleModel.readFormationToVehicleModel(data)
            );
        }

        return returnObj;
    }
}
