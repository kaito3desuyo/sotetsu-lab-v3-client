import { Expose, Type } from 'class-transformer';
import { FormationModel } from 'src/app/libs/formation/infrastructure/models/formation.model';
import { OperationModel } from 'src/app/libs/operation/infrastructure/models/operation.model';

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
    @Type(() => FormationModel)
    formation?: FormationModel;
}
