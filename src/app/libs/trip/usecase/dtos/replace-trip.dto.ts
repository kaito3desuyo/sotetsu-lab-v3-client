import { Exclude, Expose, Type } from 'class-transformer';
import { ETripDirection } from '../../special/enums/trip.enum';
import { ReplaceTimeDto } from './replace-time.dto';
import { ReplaceTripOperationListDto } from './replace-trip-operation-list.dto';

export class ReplaceTripDto {
    @Expose()
    tripId: string;

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
    @Type(() => ReplaceTimeDto)
    times: ReplaceTimeDto[];

    @Expose()
    @Type(() => ReplaceTripOperationListDto)
    tripOperationLists: ReplaceTripOperationListDto[];
}
