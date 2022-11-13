import { Exclude, Expose, Type } from 'class-transformer';
import { ETripDirection } from '../../special/enums/trip.enum';
import { CreateTimeDto } from './create-time.dto';
import { CreateTripOperationListDto } from './create-trip-operation-list.dto';

export class CreateTripDto {
    @Exclude()
    tripId: undefined;

    @Expose()
    serviceId: string;

    @Expose()
    tripNumber: string;

    @Expose()
    tripClassId: string;

    @Expose()
    tripName: string | null;

    @Expose()
    tripDirection: ETripDirection;

    @Exclude()
    tripBlockId: undefined;

    @Expose()
    depotIn: boolean;

    @Expose()
    depotOut: boolean;

    @Expose()
    calendarId: string | null;

    @Expose()
    extraCalendarId: string | null;

    @Expose()
    @Type(() => CreateTimeDto)
    times: CreateTimeDto[];

    @Expose()
    @Type(() => CreateTripOperationListDto)
    tripOperationLists: CreateTripOperationListDto[];
}
