import { IOperation } from './operation';
import { IFormation } from './formation';

export interface IOperationSighting {
  id: string;
  formationId: string;
  operationId: string;
  circulatedOperationId?: string;
  sightingTime: string;
  createdAt: string;
  updatedAt: string;
  formation?: IFormation;
  operation?: IOperation;
  circulatedOperation?: IOperation;
}

export interface ICreateOperationSighting {
  formationId: string;
  operationId: string;
  sightingTime: string;
}
