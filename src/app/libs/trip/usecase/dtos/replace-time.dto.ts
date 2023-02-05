import { Exclude, Expose } from 'class-transformer';

export class ReplaceTimeDto {
    @Expose()
    timeId: string;

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
