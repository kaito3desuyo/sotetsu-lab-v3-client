import { ETripDirection } from '../enums/trip.enum';
import { ReplaceTimeDto } from './replace-time.dto';
import { ReplaceTripOperationListDto } from './replace-trip-operation-list.dto';

export interface ReplaceTripDto {
    tripId: string;
    serviceId: string;
    tripNumber: string;
    tripClassId: string;
    tripName: string | null;
    tripDirection: ETripDirection;
    depotIn: boolean;
    depotOut: boolean;
    calendarId: string | null;
    extraCalendarId: string | null;
    times: ReplaceTimeDto[];
    tripOperationLists: ReplaceTripOperationListDto[];
}
