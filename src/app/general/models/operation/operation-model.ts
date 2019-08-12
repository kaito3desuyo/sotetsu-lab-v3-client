import { ReadOperationDto } from './operation-dto';
import { IOperation } from '../../interfaces/operation';

export class OperationModel {
  static readOperationDtoImpl(operation: ReadOperationDto): IOperation {
    const returnObj: IOperation = {
      id: operation.id,
      calenderId: operation.calender_id,
      operationNumber: operation.operation_number,
      createdAt: operation.created_at,
      updatedAt: operation.updated_at
    };

    return returnObj;
  }
}
