import { FormationModel } from 'src/app/libs/formation/infrastructure/models/formation.model';
import { OperationModel } from 'src/app/libs/operation/infrastructure/models/operation.model';

export class OperationSightingModel {
    id: string;
    formationId?: string;
    operationId?: string;
    sightingTime?: string;
    createdAt?: string;
    updatedAt?: string;
    operation?: OperationModel;
    formation?: FormationModel;
}
