import { ITrip } from '../../interfaces/trip';

export interface ITripBlock {
    id: string;
    createdAt: string;
    updatedAt: string;
    trips?: ITrip[];
}
