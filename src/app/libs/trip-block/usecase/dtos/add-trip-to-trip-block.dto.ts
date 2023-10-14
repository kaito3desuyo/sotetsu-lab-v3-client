import { Expose } from 'class-transformer';

export class AddTripToTripBlockDto {
    @Expose()
    tripId: string;
}
