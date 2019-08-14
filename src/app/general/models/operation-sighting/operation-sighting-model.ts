import { ReadOperationSightingDto } from './operation-sighting-dto';
import { IOperationSighting } from '../../interfaces/operation-sighting';
import { OperationModel } from '../operation/operation-model';
import { FormationModel } from '../formation/formation-model';

export class OperationSightingModel {
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

    return returnObj;
  }
}
