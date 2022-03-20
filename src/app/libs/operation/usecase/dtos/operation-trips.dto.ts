import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { OperationDetailsDto } from './operation-details.dto';

export class OperationTripsDto {
    operation: OperationDetailsDto;
    trips: TripOperationListDetailsDto[];
}
