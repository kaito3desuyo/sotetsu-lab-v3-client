import { Exclude, Expose } from 'class-transformer';

export class CreateTimeDto {
    @Exclude()
    timeId: undefined;

    @Exclude()
    tripId: undefined;

    @Expose()
    stationId: string;

    @Expose()
    stopId: string | null;

    @Expose()
    stopSequence: number;

    @Expose()
    pickupType: number;

    @Expose()
    dropoffType: number;

    @Expose()
    arrivalDays: number | null;

    @Expose()
    arrivalTime: string | null;

    @Expose()
    departureDays: number | null;

    @Expose()
    departureTime: string | null;
}
