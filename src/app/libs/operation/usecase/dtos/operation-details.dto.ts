import { Expose } from 'class-transformer';

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
}
