import { Expose, Type } from 'class-transformer';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';

export class OperationSightingDetailsDto {
    @Expose({ name: 'id' })
    operationSightingId: string;

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
    @Type(() => OperationDetailsDto)
    operation?: OperationDetailsDto;

    @Expose()
    @Type(() => FormationDetailsDto)
    formation?: FormationDetailsDto;
}
