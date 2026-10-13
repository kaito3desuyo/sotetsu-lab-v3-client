import { Expose, Type } from 'class-transformer';
import { FormationModel } from 'src/app/libs/formation/infrastructure/models/formation.model';
import { OperationModel } from 'src/app/libs/operation/infrastructure/models/operation.model';

export class OperationSightingInvalidationModel {
    @Expose()
    operationSightingInvalidationId: string;

    @Expose()
    operationSightingId: string;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;
}

export class OperationSightingModel {
    @Expose({ name: 'operationSightingId' })
    id: string;

    @Expose()
    formationId?: string;

    @Expose()
    operationId?: string;

    @Expose()
    sightingTime?: string;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;

    @Expose()
    @Type(() => OperationModel)
    operation?: OperationModel;

    @Expose()
    formation?: FormationModel;

    @Expose()
    @Type(() => OperationSightingInvalidationModel)
    invalidation?: OperationSightingInvalidationModel | null;

    @Expose()
    sightedAsOperation?: {
        operationId: string;
        operationNumber: string;
    } | null;
}
