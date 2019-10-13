import { IFormationToVehicle } from './formationToVehicle';

export interface IVehicle {
  id: string;
  vehicleNumber: string;
  belongs: string;
  productionDate: string;
  scrappedDate: string;
  createdAt: string;
  updatedAt: string;
  vehicleToFormations?: IFormationToVehicle[];
}
