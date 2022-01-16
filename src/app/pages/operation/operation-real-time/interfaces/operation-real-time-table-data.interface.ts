import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingWithCirculatedDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-with-circulated.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';

export interface IOperationRealTimeTableData {
    operation?: OperationDetailsDto;
    formation?: FormationDetailsDto;
    operationSighting: OperationSightingWithCirculatedDto;
    currentPosition: OperationCurrentPositionDto;
}
