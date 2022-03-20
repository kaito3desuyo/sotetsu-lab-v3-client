import { Expose } from 'class-transformer';

export class CalendarDetailsDto {
    @Expose({ name: 'id' })
    calendarId: string;

    @Expose()
    serviceId?: string;

    @Expose()
    calendarName?: string;

    @Expose()
    sunday?: boolean;

    @Expose()
    monday?: boolean;

    @Expose()
    tuesday?: boolean;

    @Expose()
    wednesday?: boolean;

    @Expose()
    thursday?: boolean;

    @Expose()
    friday?: boolean;

    @Expose()
    saturday?: boolean;

    @Expose()
    startDate?: string;

    @Expose()
    endDate?: string | null;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;
}
