import { TripModel } from 'src/app/libs/trip/infrastructure/models/trip.model';

export interface TripClassModel {
    id: string;
    serviceId?: string;
    tripClassName?: string;
    tripClassColor?: string;
    sequence?: number;
    createdAt?: string;
    updatedAt?: string;
    trips?: TripModel[];
    // service?: ServiceMOde;
}
