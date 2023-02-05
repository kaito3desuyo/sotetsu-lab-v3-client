import { Expose, Type } from 'class-transformer';
import { TripModel } from 'src/app/libs/trip/infrastructure/models/trip.model';

export class TripBlockModel {
    @Expose({ name: 'tripBlockId' })
    id: string;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;

    @Expose()
    @Type(() => TripModel)
    trips?: TripModel[];
}
