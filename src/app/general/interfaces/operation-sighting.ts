import { IOperation } from './operation';
import { IFormation } from './formation';

export interface IOperationSighting {
  id: string;
  formationId: string;
  operationId: string;
  sightingTime: string;
  createdAt: string;
  updatedAt: string;
  formation?: IFormation;
  operation?: IOperation;
}

export interface ICreateOperationSighting {
  formationId: string;
  operationId: string;
  sightingTime: string;
}
