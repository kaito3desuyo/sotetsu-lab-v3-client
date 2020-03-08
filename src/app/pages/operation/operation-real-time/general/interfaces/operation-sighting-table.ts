import { ITrip } from 'src/app/general/interfaces/trip';

export interface IOperationSightingTableData {
    id: string;
    postedOperationNumber: string;
    rotatedOperationNumber: string;
    rotatedOperationId: string;
    formationNumber: string;
    sightingTime: string;
    updatedAt: string;
    trip: IOperationCurrentPositionTableData;
}

export interface IOperationCurrentPositionTableData {
    tripId: string;
    tripBlockId: string;
    tripDirection: 0 | 1;
    tripNumber: string;
    tripClassName: string;
    tripClassColor: string;
    prevTime: string;
    prevStation: string;
    nextTime: string;
    nextStation: string;
}
