import { IFormation } from './formation';
import { IVehicle } from './vehicle';

export interface IFormationToVehicle {
  id: string;
  formationId: string;
  vehicleId: string;
  carNumber: number;
  createdAt: string;
  updatedAt: string;
  formation?: IFormation;
  vehicle?: IVehicle;
}
