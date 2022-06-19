import { TripModel } from 'src/app/libs/trip/infrastructure/models/trip.model';

export class TripBlockModel {
    id: string;
    createdAt?: string;
    updatedAt?: string;
    trips?: TripModel[];
}
