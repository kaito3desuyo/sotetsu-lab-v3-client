import { Expose, Type } from 'class-transformer';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { OperationDetailsDto } from './operation-details.dto';

export class OperationCurrentPositionDto {
    @Expose()
    @Type(() => OperationDetailsDto)
    operation: OperationDetailsDto;

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    prev?: TripOperationListDetailsDto | null;

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    current?: TripOperationListDetailsDto | null;

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    next?: TripOperationListDetailsDto | null;

    position?: {
        prev: TripOperationListDetailsDto;
        current: TripOperationListDetailsDto;
        next: TripOperationListDetailsDto;
    };
}
