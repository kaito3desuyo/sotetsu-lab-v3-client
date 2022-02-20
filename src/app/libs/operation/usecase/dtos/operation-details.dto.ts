import { Expose, Type } from 'class-transformer';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';

export class OperationDetailsDto {
    @Expose({ name: 'id' })
    operationId: string;

    @Expose()
    calendarId?: string;

    @Expose()
    operationNumber?: string;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;

    @Expose()
    @Type(() => CalendarDetailsDto)
    calendar?: CalendarDetailsDto;
}
