import { Expose, Type } from 'class-transformer';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TimeDetailsDto } from './time-details.dto';
import { TripOperationListDetailsDto } from './trip-operation-list-details.dto';

export class TripDetailsDto {
    @Expose({ name: 'id' })
    tripId: string;

    @Expose()
    serviceId?: string;

    @Expose()
    tripNumber?: string;

    @Expose()
    tripClassId?: string;

    @Expose()
    tripName?: string;

    @Expose()
    tripDirection?: number;

    @Expose()
    tripBlockId?: string;

    @Expose()
    depotIn?: boolean;

    @Expose()
    depotOut?: boolean;

    @Expose()
    calendarId?: string;

    @Expose()
    extraCalendarId?: string;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;

    @Expose()
    @Type(() => TimeDetailsDto)
    times?: TimeDetailsDto[];

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    tripOperationLists?: TripOperationListDetailsDto[];

    @Expose()
    @Type(() => TripClassDetailsDto)
    tripClass?: TripClassDetailsDto;
}
