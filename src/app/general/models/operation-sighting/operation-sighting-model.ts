import { ReadOperationSightingDto } from './operation-sighting-dto';
import { IOperationSighting } from '../../interfaces/operation-sighting';

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

    return returnObj;
  }
}
