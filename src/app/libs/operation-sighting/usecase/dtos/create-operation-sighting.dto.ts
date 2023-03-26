import { Exclude, Expose } from 'class-transformer';

export class CreateOperationSightingDto {
    @Exclude()
    operationSightingId?: undefined;

    @Expose()
    formationId: string;

    @Expose()
    operationId: string;

    @Expose()
    sightingTime: string;
}
