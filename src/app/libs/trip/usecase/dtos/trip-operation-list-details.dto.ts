import { Expose, Type } from 'class-transformer';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { TimeDetailsDto } from './time-details.dto';
import { TripDetailsDto } from './trip-details.dto';
import 'reflect-metadata';

export class TripOperationListDetailsDto {
    @Expose({ name: 'id' })
    tripOperationListId: string;

    @Expose()
    tripId?: string;

    @Expose()
    operationId?: string;

    @Expose()
    startTimeId?: string;

    @Expose()
    endTimeId?: string;

    @Expose()
    startStationId?: string;

    @Expose()
    endStationId?: string;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;

    @Expose()
    @Type(() => TripDetailsDto)
    trip?: TripDetailsDto;

    @Expose()
    @Type(() => OperationDetailsDto)
    operation?: OperationDetailsDto;

    @Expose()
    @Type(() => TimeDetailsDto)
    startTime?: TimeDetailsDto;

    @Expose()
    @Type(() => TimeDetailsDto)
    endTime?: TimeDetailsDto;
}
