import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';

export interface OperationSightingInvalidationDetailsDto {
    operationSightingInvalidationId: string;

    operationSightingId: string;

    createdAt: string;

    updatedAt: string;
}

export interface OperationSightingDetailsDto {
    operationSightingId: string;

    formationId: string;

    operationId: string;

    sightingTime: string;

    createdAt: string;

    updatedAt: string;

    operation?: OperationDetailsDto;

    formation?: FormationDetailsDto;

    invalidation?: OperationSightingInvalidationDetailsDto | null;

    sightedAsOperation?: {
        operationId: string;
        operationNumber: string;
    } | null;

    /** 同日引き継ぎの写しだけに付く、元の目撃の id */
    carriedFromSightingId?: string;

    /** 同日引き継ぎの写しだけに付く、写した枠の始まり（鉄道日の 0 時からの秒）。どの枠の写しかを示す */
    carriedRunStartSeconds?: number;
}
