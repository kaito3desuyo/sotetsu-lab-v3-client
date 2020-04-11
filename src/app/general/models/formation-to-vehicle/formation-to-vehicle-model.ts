import { ReadFormationToVehicleDto } from './formation-to-vehicle-dto';
import { IFormationToVehicle } from '../../interfaces/formationToVehicle';
import { FormationModel } from '../formation/formation-model';
import { VehicleModel } from '../vehicle/vehicle-model';

export class FormationToVehicleModel {
    static readFormationToVehicleModel(
        formationToVehicle: ReadFormationToVehicleDto
    ): IFormationToVehicle {
        const returnObj: IFormationToVehicle = {
            id: formationToVehicle.id,
            formationId: formationToVehicle.formation_id,
            vehicleId: formationToVehicle.vehicle_id,
            carNumber: formationToVehicle.car_number,
            createdAt: formationToVehicle.created_at,
            updatedAt: formationToVehicle.updated_at,
        };

        if (formationToVehicle.formation) {
            returnObj.formation = FormationModel.readFormationDtoImpl(
                formationToVehicle.formation
            );
        }

        if (formationToVehicle.vehicle) {
            returnObj.vehicle = VehicleModel.readVehicleDtoImpl(
                formationToVehicle.vehicle
            );
        }

        return returnObj;
    }
}
