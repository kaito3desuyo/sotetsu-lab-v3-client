import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { OperationDetailsDto } from './operation-details.dto';

export class OperationCurrentPositionDto {
    operation: OperationDetailsDto;
    position: {
        prev: TripOperationListDetailsDto;
        current: TripOperationListDetailsDto;
        next: TripOperationListDetailsDto;
    };
}
