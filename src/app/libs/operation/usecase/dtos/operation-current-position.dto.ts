import { TripOperationListWithTimesDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { OperationDetailsDto } from './operation-details.dto';

export interface OperationCurrentPositionDto {
    operation: OperationDetailsDto;

    prev?: TripOperationListWithTimesDto | null;

    current?: TripOperationListWithTimesDto | null;

    next?: TripOperationListWithTimesDto | null;

    position?: {
        prev: TripOperationListWithTimesDto;
        current: TripOperationListWithTimesDto;
        next: TripOperationListWithTimesDto;
    };
}
