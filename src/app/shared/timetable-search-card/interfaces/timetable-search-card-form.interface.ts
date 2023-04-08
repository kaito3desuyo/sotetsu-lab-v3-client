import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

export interface ITimetableSearchCardForm {
    calendarId?: CalendarDetailsDto['calendarId'];
    tripDirection?: TripDetailsDto['tripDirection'];
    searchByStation?: boolean;
    stationId?: StationDetailsDto['stationId'];
}
