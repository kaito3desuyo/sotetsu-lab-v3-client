import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { OperationDetailsDto } from './operation-details.dto';

export interface OperationCurrentPositionDto {
    operation: OperationDetailsDto;

    prev?: TripOperationListDetailsDto | null;

    current?: TripOperationListDetailsDto | null;

    next?: TripOperationListDetailsDto | null;

    position?: {
        prev: TripOperationListDetailsDto;
        current: TripOperationListDetailsDto;
        next: TripOperationListDetailsDto;
    };
}
