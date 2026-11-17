import { FormationModel } from 'src/app/libs/formation/infrastructure/models/formation.model';
import { OperationModel } from 'src/app/libs/operation/infrastructure/models/operation.model';

export interface OperationSightingInvalidationModel {
    operationSightingInvalidationId: string;
    operationSightingId: string;
    createdAt: string;
    updatedAt: string;
}

export interface OperationSightingModel {
    id: string;
    formationId: string;
    operationId: string;
    sightingTime: string;
    createdAt: string;
    updatedAt: string;
    operation?: OperationModel;
    formation?: FormationModel;
    invalidation?: OperationSightingInvalidationModel | null;
    sightedAsOperation?: {
        operationId: string;
        operationNumber: string;
    } | null;
    /** 同日引き継ぎの写しだけに付く、元の目撃の id */
    carriedFromSightingId?: string;
}
