import { ETripDirection } from '../enums/trip.enum';
import { CreateTimeDto } from './create-time.dto';
import { CreateTripOperationListDto } from './create-trip-operation-list.dto';

export interface CreateTripDto {
    serviceId: string;
    tripNumber: string;
    tripClassId: string;
    tripName: string | null;
    tripDirection: ETripDirection;
    depotIn: boolean;
    depotOut: boolean;
    calendarId: string | null;
    extraCalendarId: string | null;
    times: CreateTimeDto[];
    tripOperationLists: CreateTripOperationListDto[];
}
