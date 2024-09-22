import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

export interface ITimetablePostCardForm {
    calendarId?: CalendarDetailsDto['calendarId'];
    tripDirection?: TripDetailsDto['tripDirection'];
}
