import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';

export interface OperationDetailsDto {
    operationId: string;

    calendarId?: string;

    operationNumber?: string;

    createdAt?: string;

    updatedAt?: string;

    calendar?: CalendarDetailsDto;
}
