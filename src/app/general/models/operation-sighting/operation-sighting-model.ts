import {
    ReadOperationSightingDto,
    CreateOperationSightingDto
} from './operation-sighting-dto';
import { IOperationSighting } from '../../interfaces/operation-sighting';
import { OperationModel } from '../operation/operation-model';
import { FormationModel } from '../formation/formation-model';

export class OperationSightingModel {
    static createOperationSightingDtoImpl(operationSighting: {
        formationId: string;
        operationId: string;
        sightingTime: string;
    }): CreateOperationSightingDto {
        const returnObj: CreateOperationSightingDto = {
            formation_id: operationSighting.formationId,
            operation_id: operationSighting.operationId,
            sighting_time: operationSighting.sightingTime
        };

        return returnObj;
    }

    static readOperationSightingDtoImpl(
        operationSighting: ReadOperationSightingDto
    ): IOperationSighting {
        const returnObj: IOperationSighting = {
            id: operationSighting.id,
            formationId: operationSighting.formation_id,
            operationId: operationSighting.operation_id,
            sightingTime: operationSighting.sighting_time,
            createdAt: operationSighting.created_at,
            updatedAt: operationSighting.updated_at
        };

        if (operationSighting.circulated_operation_id) {
            returnObj.circulatedOperationId =
                operationSighting.circulated_operation_id;
        }

        if (operationSighting.formation) {
            returnObj.formation = FormationModel.readFormationDtoImpl(
                operationSighting.formation
            );
        }

        if (operationSighting.operation) {
            returnObj.operation = OperationModel.readOperationDtoImpl(
                operationSighting.operation
            );
        }

        if (operationSighting.circulated_operation) {
            returnObj.circulatedOperation = OperationModel.readOperationDtoImpl(
                operationSighting.circulated_operation
            );
        }

        return returnObj;
    }
}
