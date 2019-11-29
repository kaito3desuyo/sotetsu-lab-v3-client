import { ITrip } from 'src/app/general/interfaces/trip';

export interface IOperationSightingTable {
    postedOperationNumber: string;
    rotatedOperationNumber: string;
    rotatedOperationId: string;
    formationNumber: string;
    sightingTime: string;
    updatedAt: string;
    trip: any;
}
