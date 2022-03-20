import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationSightingDetailsDto } from './operation-sighting-details.dto';

export class OperationSightingWithCirculatedDto extends OperationSightingDetailsDto {
    circulatedOperationId: string;
    circulatedOperation: OperationDetailsDto;
}
