import { Expose } from 'class-transformer';

export class DeleteTripFromTripBlockDto {
    @Expose()
    tripId: string;

    @Expose()
    holdAsAnotherTripBlock: boolean;
}
