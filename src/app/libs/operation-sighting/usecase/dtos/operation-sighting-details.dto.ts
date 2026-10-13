import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';

export interface OperationSightingInvalidationDetailsDto {
    operationSightingInvalidationId: string;

    operationSightingId: string;

    createdAt?: string;

    updatedAt?: string;
}

export interface OperationSightingDetailsDto {
    operationSightingId: string;

    formationId?: string;

    operationId?: string;

    sightingTime?: string;

    createdAt?: string;

    updatedAt?: string;

    operation?: OperationDetailsDto;

    formation?: FormationDetailsDto;

    invalidation?: OperationSightingInvalidationDetailsDto | null;

    sightedAsOperation?: { operationId: string; operationNumber: string };
}
