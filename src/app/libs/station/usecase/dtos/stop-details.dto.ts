import { Expose } from 'class-transformer';

export class StopDetailsDto {
    @Expose({ name: 'id' })
    stopId: string;

    @Expose()
    stationId: string;

    @Expose()
    stopName: string;

    @Expose()
    stopDescription: string;

    @Expose()
    stopLatlng: string;

    @Expose()
    zoneId: string;

    @Expose()
    createdAt: string;

    @Expose()
    updatedAt: string;
}
